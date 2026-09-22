const databaseName = 'studentos-local-files'
const databaseVersion = 2
const fileStoreName = 'files'
const profileImageStoreName = 'profileImages'

type ProfileImageRecord = { userId: string; blob: Blob; updatedAt: number }

let databasePromise: Promise<IDBDatabase> | null = null

function getDatabase() {
  if (databasePromise) return databasePromise
  if (!('indexedDB' in window)) return Promise.reject(new Error('local-file-storage-unavailable'))

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(fileStoreName)) request.result.createObjectStore(fileStoreName, { keyPath: 'key' })
      if (!request.result.objectStoreNames.contains(profileImageStoreName)) request.result.createObjectStore(profileImageStoreName, { keyPath: 'userId' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('local-file-storage-unavailable'))
  })

  return databasePromise
}

export const profileImageMaxSize = 5 * 1024 * 1024
export const profileImageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const

export async function getProfileImage(userId: string) {
  const database = await getDatabase()
  return new Promise<Blob | null>((resolve, reject) => {
    const request = database.transaction(profileImageStoreName, 'readonly').objectStore(profileImageStoreName).get(userId)
    request.onsuccess = () => resolve((request.result as ProfileImageRecord | undefined)?.blob ?? null)
    request.onerror = () => reject(new Error('local-file-read-failed'))
  })
}

export async function saveProfileImage(userId: string, file: File) {
  if (!profileImageTypes.includes(file.type as (typeof profileImageTypes)[number])) throw new Error('profile-image-type-invalid')
  if (file.size > profileImageMaxSize) throw new Error('profile-image-too-large')
  const database = await getDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(profileImageStoreName, 'readwrite').objectStore(profileImageStoreName).put({ userId, blob: file, updatedAt: Date.now() } satisfies ProfileImageRecord)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('local-file-save-failed'))
  })
}

export async function removeProfileImage(userId: string) {
  const database = await getDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(profileImageStoreName, 'readwrite').objectStore(profileImageStoreName).delete(userId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('local-file-delete-failed'))
  })
}
