import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './useAuth.ts'
import { VaultContext, type VaultStatus } from './VaultContext.ts'
import { createVault, createVaultEntry, decryptVaultEntry, deleteVaultEntry, getEncryptedVaultEntries, getVaultConfig, getVaultErrorMessage, migrateVaultPassword, subscribeToEncryptedVaultEntries, updateVaultEntry, verifyVaultPassword, resetVault as resetVaultData, VaultCryptoError } from '../services/vaultCryptoService.ts'
import { autoLockDurations, type AutoLockDuration, type VaultConfig, type VaultEntry, type VaultEntryPayload } from '../types/vault.ts'
import { validateMasterPassword } from '../utils/password.ts'

const autoLockStorageKey = 'studentos-vault-auto-lock'

function storedAutoLockDuration(): AutoLockDuration {
  const stored = window.localStorage.getItem(autoLockStorageKey)
  if (stored === 'never') return 'never'
  const value = Number(stored)
  return autoLockDurations.some((option) => option.value === value) ? value as AutoLockDuration : 5
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid
  const keyRef = useRef<CryptoKey | null>(null)
  const [status, setStatus] = useState<VaultStatus>('loading')
  const [config, setConfig] = useState<VaultConfig | null>(null)
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [autoLockDuration, setAutoLockDurationState] = useState<AutoLockDuration>(storedAutoLockDuration)

  function clearMemory() {
    keyRef.current = null
    setEntries([])
    setStatus((current) => current === 'setup' ? current : 'locked')
  }

  async function loadVault() {
    if (!uid) return
    setStatus('loading')
    setError('')
    try {
      const nextConfig = await getVaultConfig(uid)
      setConfig(nextConfig)
      setStatus(nextConfig ? 'locked' : 'setup')
    } catch (reason) {
      setStatus('unavailable')
      setError(getVaultErrorMessage(reason, 'The vault could not be loaded.'))
    }
  }

  useEffect(() => {
    keyRef.current = null
    queueMicrotask(() => {
      setEntries([])
      setConfig(null)
      setError('')
    })
    if (!uid) {
      queueMicrotask(() => setStatus('locked'))
      return undefined
    }
    let active = true
    queueMicrotask(() => setStatus('loading'))
    void getVaultConfig(uid).then((nextConfig) => {
      if (!active) return
      setConfig(nextConfig)
      setStatus(nextConfig ? 'locked' : 'setup')
    }).catch((reason) => {
      if (!active) return
      setStatus('unavailable')
      setError(getVaultErrorMessage(reason, 'The vault could not be loaded.'))
    })
    return () => {
      active = false
      keyRef.current = null
      setEntries([])
    }
  }, [uid])

  useEffect(() => {
    if (!uid || status !== 'unlocked' || !config || !keyRef.current) return undefined
    let active = true
    const unsubscribe = subscribeToEncryptedVaultEntries(uid, (encryptedEntries) => {
      const key = keyRef.current
      if (!key) return
      void Promise.all(encryptedEntries.filter((entry) => entry.entrySetId === config.entrySetId).map((entry) => decryptVaultEntry(key, entry))).then((decrypted) => {
        if (active) setEntries(decrypted.sort((a, b) => a.name.localeCompare(b.name)))
      }).catch(() => {
        if (!active) return
        clearMemory()
        setError('A vault entry could not be decrypted. The vault has been locked for safety.')
      })
    }, (reason) => {
      if (active) setError(getVaultErrorMessage(reason, 'Vault entries could not be loaded.'))
    })
    return () => { active = false; unsubscribe() }
  }, [config, status, uid])

  useEffect(() => {
    if (status !== 'unlocked' || autoLockDuration === 'never') return undefined
    let timeout: ReturnType<typeof setTimeout>
    let lastActivity = 0
    const lockFromInactivity = () => {
      keyRef.current = null
      setEntries([])
      setStatus('locked')
      setError('Vault locked after inactivity.')
    }
    const schedule = () => {
      clearTimeout(timeout)
      timeout = setTimeout(lockFromInactivity, autoLockDuration * 60_000)
    }
    const onActivity = () => {
      const now = Date.now()
      if (now - lastActivity < 750) return
      lastActivity = now
      schedule()
    }
    schedule()
    window.addEventListener('pointerdown', onActivity, { passive: true })
    window.addEventListener('keydown', onActivity)
    window.addEventListener('touchstart', onActivity, { passive: true })
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('touchstart', onActivity)
    }
  }, [autoLockDuration, status])

  async function run<T>(operation: () => Promise<T>) {
    setBusy(true)
    setError('')
    try {
      return await operation()
    } catch (reason) {
      setError(getVaultErrorMessage(reason))
      throw reason
    } finally {
      setBusy(false)
    }
  }

  async function createNewVault(masterPassword: string) {
    const validation = validateMasterPassword(masterPassword)
    if (validation) { setError(validation); throw new VaultCryptoError('invalid-password') }
    if (!uid) return
    await run(async () => {
      const result = await createVault(uid, masterPassword)
      keyRef.current = result.key
      setConfig(result.config)
      setEntries([])
      setStatus('unlocked')
    })
  }

  async function unlockVault(masterPassword: string) {
    if (!uid || !config) return
    await run(async () => {
      const key = await verifyVaultPassword(config, masterPassword)
      const encryptedEntries = await getEncryptedVaultEntries(uid)
      const decrypted = await Promise.all(encryptedEntries.filter((entry) => entry.entrySetId === config.entrySetId).map((entry) => decryptVaultEntry(key, entry)))
      keyRef.current = key
      setEntries(decrypted.sort((a, b) => a.name.localeCompare(b.name)))
      setStatus('unlocked')
    })
  }

  function lockVault() {
    clearMemory()
    setError('')
  }

  async function createEntry(payload: VaultEntryPayload) {
    if (!uid || !config || !keyRef.current) throw new VaultCryptoError('incorrect-password')
    await run(async () => { await createVaultEntry(uid, keyRef.current as CryptoKey, config.entrySetId, payload) })
  }

  async function updateEntry(id: string, payload: VaultEntryPayload) {
    const entry = entries.find((item) => item.id === id)
    if (!uid || !config || !keyRef.current || !entry) throw new VaultCryptoError('incorrect-password')
    await run(async () => { await updateVaultEntry(uid, keyRef.current as CryptoKey, { id: entry.id, entrySetId: config.entrySetId, createdAt: entry.createdAt }, payload) })
  }

  async function deleteEntry(id: string) {
    if (!uid || !keyRef.current) throw new VaultCryptoError('incorrect-password')
    await run(async () => { await deleteVaultEntry(uid, id) })
  }

  async function changeMasterPassword(currentPassword: string, newPassword: string) {
    const validation = validateMasterPassword(newPassword)
    if (validation) { setError(validation); throw new VaultCryptoError('invalid-password') }
    if (!uid || !config) return false
    return run(async () => {
      const currentKey = await verifyVaultPassword(config, currentPassword)
      const result = await migrateVaultPassword(uid, config, currentKey, newPassword)
      keyRef.current = result.key
      setConfig(result.config)
      setEntries(await Promise.all(result.encryptedEntries.map((entry) => decryptVaultEntry(result.key, entry))))
      setStatus('unlocked')
      if (result.cleanupPending) setError('Master password changed. Old encrypted records could not be cleaned up yet.')
      return result.cleanupPending
    })
  }

  async function resetVault() {
    if (!uid) return
    await run(async () => {
      await resetVaultData(uid)
      keyRef.current = null
      setEntries([])
      setConfig(null)
      setStatus('setup')
    })
  }

  function setAutoLockDuration(duration: AutoLockDuration) {
    setAutoLockDurationState(duration)
    window.localStorage.setItem(autoLockStorageKey, String(duration))
  }

  return <VaultContext.Provider value={{ status, config, entries, error, busy, autoLockDuration, clearError: () => setError(''), createVault: createNewVault, unlockVault, lockVault, createEntry, updateEntry, deleteEntry, changeMasterPassword, resetVault, setAutoLockDuration, reloadVault: loadVault }}>{children}</VaultContext.Provider>
}
