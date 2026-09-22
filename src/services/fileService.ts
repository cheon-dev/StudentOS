import { Timestamp } from 'firebase/firestore'
import type { FileCategory, FileMetadata } from '../types/file.ts'

type StoredFile = {
  key: string
  userId: string
  id: string
  name: string
  mimeType: string
  size: number
  category: FileCategory
  subjectId: string | null
  projectId: string | null
  createdAt: number
  updatedAt: number
  blob: Blob
}

const databaseName = 'studentos-local-files'
const databaseVersion = 2
const profileImageStoreName = 'profileImages'
const storeName = 'files'
const subscribers = new Map<string, Set<(files: FileMetadata[]) => void>>()
const objectUrls = new Map<string, string>()
let databasePromise: Promise<IDBDatabase> | null = null

function getDatabase() {
  if (databasePromise) return databasePromise
  if (!('indexedDB' in window)) return Promise.reject(new Error('local-file-storage-unavailable'))

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: 'key' })
      }
      if (!request.result.objectStoreNames.contains(profileImageStoreName)) request.result.createObjectStore(profileImageStoreName, { keyPath: 'userId' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('local-file-storage-unavailable'))
  })

  return databasePromise
}

function recordKey(userId: string, fileId: string) {
  return `${userId}:${fileId}`
}

function newFileId() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readRecords(userId: string) {
  return getDatabase().then((database) => new Promise<StoredFile[]>((resolve, reject) => {
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll()
    request.onsuccess = () => resolve((request.result as StoredFile[]).filter((file) => file.userId === userId))
    request.onerror = () => reject(new Error('local-file-read-failed'))
  }))
}

function toMetadata(file: StoredFile): FileMetadata {
  const oldUrl = objectUrls.get(file.key)
  if (oldUrl) URL.revokeObjectURL(oldUrl)
  const downloadURL = URL.createObjectURL(file.blob)
  objectUrls.set(file.key, downloadURL)

  return {
    id: file.id,
    name: file.name,
    storagePath: `indexeddb://users/${file.userId}/files/${file.id}`,
    downloadURL,
    mimeType: file.mimeType,
    size: file.size,
    category: file.category,
    subjectId: file.subjectId,
    projectId: file.projectId,
    createdAt: Timestamp.fromMillis(file.createdAt),
    updatedAt: Timestamp.fromMillis(file.updatedAt),
  }
}

async function notify(userId: string) {
  const listeners = subscribers.get(userId)
  if (!listeners?.size) return
  const records = await readRecords(userId)
  const currentListeners = subscribers.get(userId)
  if (!currentListeners?.size) return
  const files = records.sort((first, second) => second.createdAt - first.createdAt).map(toMetadata)
  currentListeners.forEach((listener) => listener(files))
}

function saveRecord(record: StoredFile) {
  return getDatabase().then((database) => new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, 'readwrite').objectStore(storeName).put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('local-file-storage-full'))
  }))
}

export function subscribeToFiles(userId: string, onFiles: (files: FileMetadata[]) => void, onError: (error: unknown) => void) {
  const listenerSet = subscribers.get(userId) ?? new Set<(files: FileMetadata[]) => void>()
  listenerSet.add(onFiles)
  subscribers.set(userId, listenerSet)
  void notify(userId).catch(onError)

  return () => {
    listenerSet.delete(onFiles)
    if (!listenerSet.size) subscribers.delete(userId)
    objectUrls.forEach((url, key) => {
      if (key.startsWith(`${userId}:`)) {
        URL.revokeObjectURL(url)
        objectUrls.delete(key)
      }
    })
  }
}

export function uploadUserFile(userId: string, fileData: File, metadata: { category: FileCategory; subjectId: string | null; projectId: string | null }, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100))
    }
    reader.onerror = () => reject(new Error('local-file-save-failed'))
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error('local-file-save-failed'))
        return
      }

      const id = newFileId()
      const now = Date.now()
      const record: StoredFile = {
        key: recordKey(userId, id),
        userId,
        id,
        name: fileData.name,
        mimeType: fileData.type || 'application/octet-stream',
        size: fileData.size,
        category: metadata.category,
        subjectId: metadata.subjectId,
        projectId: metadata.projectId,
        createdAt: now,
        updatedAt: now,
        blob: new Blob([reader.result], { type: fileData.type || 'application/octet-stream' }),
      }

      onProgress(100)
      void saveRecord(record).then(() => notify(userId)).then(() => resolve()).catch(reject)
    }
    reader.readAsArrayBuffer(fileData)
  })
}

export async function renameFile(userId: string, id: string, name: string) {
  const database = await getDatabase()
  const record = await new Promise<StoredFile>((resolve, reject) => {
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(recordKey(userId, id))
    request.onsuccess = () => request.result ? resolve(request.result as StoredFile) : reject(new Error('not-found'))
    request.onerror = () => reject(new Error('local-file-read-failed'))
  })
  record.name = name.trim()
  record.updatedAt = Date.now()
  await saveRecord(record)
  await notify(userId)
}

export async function deleteUserFile(userId: string, metadata: FileMetadata) {
  const database = await getDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, 'readwrite').objectStore(storeName).delete(recordKey(userId, metadata.id))
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('local-file-delete-failed'))
  })
  const url = objectUrls.get(recordKey(userId, metadata.id))
  if (url) {
    URL.revokeObjectURL(url)
    objectUrls.delete(recordKey(userId, metadata.id))
  }
  await notify(userId)
}

export async function clearUserFiles(userId: string) {
  const database = await getDatabase()
  const records = await readRecords(userId)
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    records.forEach((file) => transaction.objectStore(storeName).delete(file.key))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('local-file-delete-failed'))
  })
  records.forEach((file) => {
    const url = objectUrls.get(file.key)
    if (url) {
      URL.revokeObjectURL(url)
      objectUrls.delete(file.key)
    }
  })
  const listeners = subscribers.get(userId)
  listeners?.forEach((listener) => listener([]))
}
