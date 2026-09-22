import { useContext } from 'react'
import { VaultContext } from './VaultContext.ts'

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) throw new Error('useVault must be used inside VaultProvider')
  return context
}
