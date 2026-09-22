import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch, type DocumentData, type FirestoreError } from 'firebase/firestore'
import { db } from '../firebase/config.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { vaultAlgorithm, vaultIterations, vaultKdf, vaultVersion, type EncryptedVaultEntry, type VaultConfig, type VaultEntryPayload } from '../types/vault.ts'

const configDocument = (uid: string) => doc(db, 'users', uid, 'vaultConfig', 'config')
const entriesCollection = (uid: string) => collection(db, 'users', uid, 'vaultEntries')
const entryDocument = (uid: string, id: string) => doc(db, 'users', uid, 'vaultEntries', id)
const verificationPayload = 'studentos-vault-verification-v1'
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export class VaultCryptoError extends Error {
  public readonly code: 'incorrect-password' | 'invalid-config' | 'decrypt-failed' | 'crypto-failed' | 'crypto-unavailable' | 'invalid-password'

  constructor(code: 'incorrect-password' | 'invalid-config' | 'decrypt-failed' | 'crypto-failed' | 'crypto-unavailable' | 'invalid-password') {
    super(code)
    this.code = code
    this.name = 'VaultCryptoError'
  }
}

function randomBytes(length: number) {
  requireWebCrypto()
  return crypto.getRandomValues(new Uint8Array(length))
}

function requireWebCrypto() {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto.subtle) throw new VaultCryptoError('crypto-unavailable')
}

function randomId() {
  return bytesToBase64(randomBytes(18)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function buffer(value: Uint8Array) {
  return value as BufferSource
}

function timestamp(data: DocumentData, key: string) {
  return data[key] instanceof Timestamp ? data[key] as Timestamp : null
}

function mapConfig(data: DocumentData): VaultConfig {
  if (typeof data.salt !== 'string' || typeof data.verificationCiphertext !== 'string' || typeof data.verificationIv !== 'string' || data.kdf !== vaultKdf || data.algorithm !== vaultAlgorithm || data.version !== vaultVersion || typeof data.iterations !== 'number' || typeof data.entrySetId !== 'string') {
    throw new VaultCryptoError('invalid-config')
  }
  return { salt: data.salt, verificationCiphertext: data.verificationCiphertext, verificationIv: data.verificationIv, kdf: vaultKdf, iterations: data.iterations, algorithm: vaultAlgorithm, version: vaultVersion, entrySetId: data.entrySetId, createdAt: timestamp(data, 'createdAt'), updatedAt: timestamp(data, 'updatedAt') }
}

function mapEntry(id: string, data: DocumentData): EncryptedVaultEntry {
  if (typeof data.ciphertext !== 'string' || typeof data.iv !== 'string' || typeof data.entrySetId !== 'string') throw new VaultCryptoError('invalid-config')
  return { id, ciphertext: data.ciphertext, iv: data.iv, version: typeof data.version === 'number' ? data.version : 0, entrySetId: data.entrySetId, createdAt: timestamp(data, 'createdAt'), updatedAt: timestamp(data, 'updatedAt') }
}

export function getVaultErrorMessage(reason: unknown, fallback = 'The vault operation could not be completed.') {
  if (reason instanceof VaultCryptoError) {
    if (reason.code === 'incorrect-password') return 'Incorrect master password.'
    if (reason.code === 'invalid-password') return 'Use a stronger master password and try again.'
    if (reason.code === 'decrypt-failed') return 'This vault entry could not be decrypted.'
    if (reason.code === 'invalid-config') return 'The vault configuration is invalid or incomplete.'
    if (reason.code === 'crypto-unavailable') return 'Browser encryption is unavailable here. Open StudentOS through localhost or HTTPS.'
    return 'Encryption failed. Please try again.'
  }
  if (typeof reason === 'object' && reason !== null && 'code' in reason) return getFirebaseErrorMessage(reason, fallback)
  return fallback
}

export async function deriveVaultKey(masterPassword: string, salt: string, iterations = vaultIterations) {
  if (!masterPassword) throw new VaultCryptoError('invalid-password')
  requireWebCrypto()
  try {
    const material = await crypto.subtle.importKey('raw', buffer(textEncoder.encode(masterPassword)), { name: vaultKdf }, false, ['deriveKey'])
    return await crypto.subtle.deriveKey({ name: vaultKdf, salt: buffer(base64ToBytes(salt)), iterations, hash: 'SHA-256' }, material, { name: vaultAlgorithm, length: 256 }, false, ['encrypt', 'decrypt'])
  } catch {
    throw new VaultCryptoError('crypto-failed')
  }
}

async function encryptValue(key: CryptoKey, value: unknown) {
  try {
    requireWebCrypto()
    const iv = randomBytes(12)
    const ciphertext = await crypto.subtle.encrypt({ name: vaultAlgorithm, iv: buffer(iv) }, key, buffer(textEncoder.encode(JSON.stringify(value))))
    return { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv) }
  } catch {
    throw new VaultCryptoError('crypto-failed')
  }
}

async function decryptValue<T>(key: CryptoKey, ciphertext: string, iv: string): Promise<T> {
  try {
    const plaintext = await crypto.subtle.decrypt({ name: vaultAlgorithm, iv: buffer(base64ToBytes(iv)) }, key, buffer(base64ToBytes(ciphertext)))
    return JSON.parse(textDecoder.decode(plaintext)) as T
  } catch {
    throw new VaultCryptoError('decrypt-failed')
  }
}

export async function getVaultConfig(uid: string) {
  const snapshot = await getDoc(configDocument(uid))
  return snapshot.exists() ? mapConfig(snapshot.data()) : null
}

export async function createVault(uid: string, masterPassword: string) {
  const existing = await getVaultConfig(uid)
  if (existing) throw new VaultCryptoError('invalid-config')
  const salt = bytesToBase64(randomBytes(16))
  const key = await deriveVaultKey(masterPassword, salt)
  const verification = await encryptValue(key, verificationPayload)
  const now = Timestamp.now()
  const config: VaultConfig = { salt, verificationCiphertext: verification.ciphertext, verificationIv: verification.iv, kdf: vaultKdf, iterations: vaultIterations, algorithm: vaultAlgorithm, version: vaultVersion, entrySetId: randomId(), createdAt: now, updatedAt: now }
  await setDoc(configDocument(uid), { ...config, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return { config, key }
}

export async function verifyVaultPassword(config: VaultConfig, masterPassword: string) {
  const key = await deriveVaultKey(masterPassword, config.salt, config.iterations)
  try {
    const value = await decryptValue<string>(key, config.verificationCiphertext, config.verificationIv)
    if (value !== verificationPayload) throw new VaultCryptoError('incorrect-password')
  } catch (reason) {
    if (reason instanceof VaultCryptoError && reason.code === 'incorrect-password') throw reason
    throw new VaultCryptoError('incorrect-password')
  }
  return key
}

export function subscribeToEncryptedVaultEntries(uid: string, next: (entries: EncryptedVaultEntry[]) => void, error: (reason: FirestoreError) => void) {
  return onSnapshot(entriesCollection(uid), (snapshot) => next(snapshot.docs.map((entry) => mapEntry(entry.id, entry.data()))), error)
}

export async function getEncryptedVaultEntries(uid: string) {
  const snapshot = await getDocs(entriesCollection(uid))
  return snapshot.docs.map((entry) => mapEntry(entry.id, entry.data()))
}

export async function decryptVaultEntry(key: CryptoKey, entry: EncryptedVaultEntry) {
  const payload = await decryptValue<VaultEntryPayload>(key, entry.ciphertext, entry.iv)
  return { ...payload, id: entry.id, createdAt: entry.createdAt, updatedAt: entry.updatedAt }
}

function encryptedPayload(entry: { ciphertext: string; iv: string; entrySetId: string; createdAt?: unknown; updatedAt?: unknown }) {
  return { ciphertext: entry.ciphertext, iv: entry.iv, version: vaultVersion, entrySetId: entry.entrySetId, ...(entry.createdAt ? { createdAt: entry.createdAt } : { createdAt: serverTimestamp() }), ...(entry.updatedAt ? { updatedAt: entry.updatedAt } : { updatedAt: serverTimestamp() }) }
}

export async function createVaultEntry(uid: string, key: CryptoKey, entrySetId: string, payload: VaultEntryPayload) {
  const encrypted = await encryptValue(key, payload)
  const reference = await addDoc(entriesCollection(uid), encryptedPayload({ ...encrypted, entrySetId }))
  return reference.id
}

export async function updateVaultEntry(uid: string, key: CryptoKey, entry: { id: string; entrySetId: string; createdAt: Timestamp | null }, payload: VaultEntryPayload) {
  const encrypted = await encryptValue(key, payload)
  await updateDoc(entryDocument(uid, entry.id), encryptedPayload({ ...encrypted, entrySetId: entry.entrySetId, createdAt: entry.createdAt ?? undefined, updatedAt: undefined }))
}

export async function deleteVaultEntry(uid: string, id: string) {
  await deleteDoc(entryDocument(uid, id))
}

async function commitInChunks<T>(items: T[], commit: (chunk: T[]) => Promise<void>) {
  for (let index = 0; index < items.length; index += 450) await commit(items.slice(index, index + 450))
}

export async function resetVault(uid: string) {
  const entries = await getEncryptedVaultEntries(uid)
  await commitInChunks(entries, async (chunk) => {
    const batch = writeBatch(db)
    chunk.forEach((entry) => batch.delete(entryDocument(uid, entry.id)))
    await batch.commit()
  })
  await deleteDoc(configDocument(uid))
}

export async function migrateVaultPassword(uid: string, config: VaultConfig, currentKey: CryptoKey, newPassword: string) {
  const oldEntries = (await getEncryptedVaultEntries(uid)).filter((entry) => entry.entrySetId === config.entrySetId)
  const plaintextEntries = await Promise.all(oldEntries.map((entry) => decryptVaultEntry(currentKey, entry)))
  const salt = bytesToBase64(randomBytes(16))
  const key = await deriveVaultKey(newPassword, salt)
  const verification = await encryptValue(key, verificationPayload)
  const entrySetId = randomId()
  const now = Timestamp.now()
  const newConfig: VaultConfig = { salt, verificationCiphertext: verification.ciphertext, verificationIv: verification.iv, kdf: vaultKdf, iterations: vaultIterations, algorithm: vaultAlgorithm, version: vaultVersion, entrySetId, createdAt: config.createdAt ?? now, updatedAt: now }
  const encryptedEntries = await Promise.all(plaintextEntries.map(async (entry) => ({ id: randomId(), ...(await encryptValue(key, { name: entry.name, username: entry.username, password: entry.password, website: entry.website, notes: entry.notes })), entrySetId, version: vaultVersion, createdAt: entry.createdAt ?? now, updatedAt: now })))
  await commitInChunks(encryptedEntries, async (chunk) => {
    const batch = writeBatch(db)
    chunk.forEach((entry) => batch.set(entryDocument(uid, entry.id), encryptedPayload(entry)))
    await batch.commit()
  })
  await setDoc(configDocument(uid), { ...newConfig, updatedAt: serverTimestamp() })
  let cleanupPending = false
  try {
    await commitInChunks(oldEntries, async (chunk) => {
      const batch = writeBatch(db)
      chunk.forEach((entry) => batch.delete(entryDocument(uid, entry.id)))
      await batch.commit()
    })
  } catch {
    cleanupPending = true
  }
  return { config: newConfig, key, encryptedEntries, cleanupPending }
}
