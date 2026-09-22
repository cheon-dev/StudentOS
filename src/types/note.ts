import type { Timestamp } from 'firebase/firestore'

export type NoteFormData = {
  title: string
  content: string
  subjectId: string | null
  tags: string[]
  isPinned: boolean
}

export type Note = NoteFormData & {
  id: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export function emptyNote(): NoteFormData {
  return { title: '', content: '', subjectId: null, tags: [], isPinned: false }
}
