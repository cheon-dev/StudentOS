import { FirebaseError } from 'firebase/app'

export function getFirebaseErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (error instanceof Error && error.message === 'storage-not-ready') {
    return 'Firebase Storage is not available yet. Create the Storage bucket and publish the Storage rules, then try again.'
  }

  if (error instanceof Error && error.message === 'local-file-storage-unavailable') {
    return 'This browser does not allow local file storage. Check private browsing settings or try another browser.'
  }

  if (error instanceof Error && error.message === 'local-file-storage-full') {
    return 'This device is low on browser storage. Delete unused files and try again.'
  }

  if (error instanceof Error && error.message === 'local-file-save-failed') {
    return 'The file could not be saved on this device. Try again with a smaller file.'
  }

  if (error instanceof Error && error.message === 'profile-image-type-invalid') return 'Choose a JPG, PNG, or WebP image.'
  if (error instanceof Error && error.message === 'profile-image-too-large') return 'Profile images must be 5 MB or smaller.'

  let errorCode: string | null = null

  if (error instanceof FirebaseError) {
    errorCode = error.code
  } else if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    errorCode = error.code
  }

  if (!errorCode) {
    return fallback
  }

  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/network-request-failed': 'Check your internet connection and try again.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in window.',
    'auth/popup-closed-by-user': 'The Google sign-in window was closed.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/requires-recent-login': 'For your security, sign in again before continuing.',
    'auth/user-token-expired': 'Your session expired. Sign in again before continuing.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'The email or password is incorrect.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/wrong-password': 'The email or password is incorrect.',
    'storage/bucket-not-found': 'Firebase Storage is not enabled for this project yet. Create the Storage bucket, then try again.',
    'storage/project-not-found': 'Firebase Storage is not enabled for this project yet. Create the Storage bucket, then try again.',
    'storage/unauthorized': 'You do not have permission to upload this file. Check the published Storage rules.',
    'storage/retry-limit-exceeded': 'The upload took too long. Check your connection and try again.',
    'storage/canceled': 'The upload was canceled.',
    'storage/unknown': 'Firebase Storage could not complete the upload. Confirm that Storage is enabled and try again.',
    'failed-precondition': 'This request could not be completed right now.',
    'not-found': 'The requested record could not be found.',
    'permission-denied': 'You do not have permission to access this information.',
    unavailable: 'The service is temporarily unavailable. Check your connection and try again.',
  }

  return messages[errorCode] ?? fallback
}
