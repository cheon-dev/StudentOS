import type { Timestamp } from 'firebase/firestore'

export const vaultAlgorithm = 'AES-GCM' as const
export const vaultKdf = 'PBKDF2' as const
export const vaultVersion = 1
export const vaultIterations = 600_000

export type VaultEntryPayload = {
  name: string
  username: string
  password: string
  website: string
  notes: string
}

export type VaultEntry = VaultEntryPayload & {
  id: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type VaultConfig = {
  salt: string
  verificationCiphertext: string
  verificationIv: string
  kdf: typeof vaultKdf
  iterations: number
  algorithm: typeof vaultAlgorithm
  version: number
  entrySetId: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type EncryptedVaultEntry = {
  id: string
  ciphertext: string
  iv: string
  version: number
  entrySetId: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type AutoLockDuration = 1 | 5 | 15 | 30 | 'never'

export const autoLockDurations: Array<{ value: AutoLockDuration; label: string }> = [
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 'never', label: 'Never while app is open' },
]

export function emptyVaultEntry(): VaultEntryPayload {
  return { name: '', username: '', password: '', website: '', notes: '' }
}
