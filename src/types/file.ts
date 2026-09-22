import type { Timestamp } from 'firebase/firestore'

export const fileCategories = ['School', 'Projects', 'Personal', 'Reference', 'Other'] as const
export type FileCategory = (typeof fileCategories)[number]
export type FileMetadata = { id: string; name: string; storagePath: string; downloadURL: string; mimeType: string; size: number; category: FileCategory; subjectId: string | null; projectId: string | null; createdAt: Timestamp | null; updatedAt: Timestamp | null }
