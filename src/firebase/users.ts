import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from './config.ts'
import type { UserProfile, UserProfileInput } from '../types/userProfile.ts'

export type AuthProviderName = 'password' | 'google'

export async function syncUserDocument(
  user: User,
  provider: AuthProviderName,
  preferredName?: string,
) {
  const userReference = doc(db, 'users', user.uid)
  const existingDocument = await getDoc(userReference)
  const existingData = existingDocument.data()
  const fullName =
    preferredName?.trim() || existingData?.displayName || existingData?.fullName || user.displayName || 'Student'

  const userData = {
    uid: user.uid,
    fullName,
    displayName: fullName,
    email: user.email ?? '',
    photoURL: user.photoURL ?? null,
    provider,
    updatedAt: serverTimestamp(),
  }

  await setDoc(
    userReference,
    existingDocument.exists()
      ? userData
      : { ...userData, createdAt: serverTimestamp() },
    { merge: true },
  )
}

function timestampValue(value: unknown) {
  return value instanceof Timestamp ? value : null
}

export async function getUserProfile(user: User): Promise<UserProfile> {
  const snapshot = await getDoc(doc(db, 'users', user.uid))
  const data = snapshot.data() ?? {}
  return {
    displayName: typeof data.displayName === 'string' ? data.displayName : typeof data.fullName === 'string' ? data.fullName : user.displayName ?? 'Student',
    email: user.email ?? '',
    studentId: typeof data.studentId === 'string' ? data.studentId : '',
    school: typeof data.school === 'string' ? data.school : '',
    course: typeof data.course === 'string' ? data.course : '',
    yearLevel: typeof data.yearLevel === 'string' ? data.yearLevel : '',
    section: typeof data.section === 'string' ? data.section : '',
    bio: typeof data.bio === 'string' ? data.bio : '',
    provider: data.provider === 'google' ? 'google' : 'password',
    createdAt: timestampValue(data.createdAt),
    updatedAt: timestampValue(data.updatedAt),
  }
}

export async function saveUserProfile(uid: string, input: UserProfileInput) {
  const reference = doc(db, 'users', uid)
  const existing = await getDoc(reference)
  await setDoc(reference, {
    displayName: input.displayName.trim(),
    fullName: input.displayName.trim(),
    studentId: input.studentId.trim(),
    school: input.school.trim(),
    course: input.course.trim(),
    yearLevel: input.yearLevel.trim(),
    section: input.section.trim(),
    bio: input.bio.trim(),
    updatedAt: serverTimestamp(),
    ...(existing.data()?.createdAt ? {} : { createdAt: serverTimestamp() }),
  }, { merge: true })
}
