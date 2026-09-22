import type { Timestamp } from 'firebase/firestore'

export type UserProfile = {
  displayName: string
  email: string
  studentId: string
  school: string
  course: string
  yearLevel: string
  section: string
  bio: string
  provider: 'password' | 'google'
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type UserProfileInput = Omit<UserProfile, 'email' | 'provider' | 'createdAt' | 'updatedAt'>
