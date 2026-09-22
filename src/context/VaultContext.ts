import { createContext } from 'react'
import type { VaultConfig, VaultEntry, VaultEntryPayload, AutoLockDuration } from '../types/vault.ts'

export type VaultStatus = 'loading' | 'unavailable' | 'setup' | 'locked' | 'unlocked'

export type VaultContextValue = {
  status: VaultStatus
  config: VaultConfig | null
  entries: VaultEntry[]
  error: string
  busy: boolean
  autoLockDuration: AutoLockDuration
  clearError: () => void
  createVault: (masterPassword: string) => Promise<void>
  unlockVault: (masterPassword: string) => Promise<void>
  lockVault: () => void
  createEntry: (payload: VaultEntryPayload) => Promise<void>
  updateEntry: (id: string, payload: VaultEntryPayload) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  changeMasterPassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  resetVault: () => Promise<void>
  setAutoLockDuration: (duration: AutoLockDuration) => void
  reloadVault: () => Promise<void>
}

export const VaultContext = createContext<VaultContextValue | undefined>(undefined)
