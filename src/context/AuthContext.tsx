import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { auth } from '../firebase/config.ts'
import { getUserProfile } from '../firebase/users.ts'
import { getProfileImage } from '../services/profileImageService.ts'
import type { UserProfile } from '../types/userProfile.ts'
import { AuthContext } from './AuthContext.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const latestUidRef = useRef<string | null>(null)

  async function loadProfile(currentUser: User) {
    setProfileLoading(true)
    try {
      const nextProfile = await getUserProfile(currentUser)
      let image: Blob | null = null
      try {
        image = await getProfileImage(currentUser.uid)
      } catch {
        // Profile data remains available when this browser blocks IndexedDB.
      }
      if (latestUidRef.current !== currentUser.uid) return
      setProfile(nextProfile)
      setAvatarUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl)
        return image ? URL.createObjectURL(image) : null
      })
    } finally {
      if (latestUidRef.current === currentUser.uid) setProfileLoading(false)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      latestUidRef.current = currentUser?.uid ?? null
      setUser(currentUser)
      setLoading(false)
      if (!currentUser) {
        setProfile(null)
        setProfileLoading(false)
        setAvatarUrl((currentUrl) => {
          if (currentUrl) URL.revokeObjectURL(currentUrl)
          return null
        })
        return
      }
      setProfile(null)
      setAvatarUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl)
        return null
      })
      void loadProfile(currentUser).catch(() => setProfileLoading(false))
    })

    return () => {
      unsubscribe()
      setAvatarUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl)
        return null
      })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, profile, profileLoading, avatarUrl, refreshProfile: async () => { if (auth.currentUser) await loadProfile(auth.currentUser) } }}>
      {children}
    </AuthContext.Provider>
  )
}
