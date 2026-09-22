import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../types/userProfile.ts'

type AuthContextValue = {
  user: User | null
  loading: boolean
  profile: UserProfile | null
  profileLoading: boolean
  avatarUrl: string | null
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
