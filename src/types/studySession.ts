import type { Timestamp } from 'firebase/firestore'

export type StudySession = {
  id: string
  subjectId: string | null
  taskId: string | null
  startedAt: Timestamp
  endedAt: Timestamp | null
  plannedMinutes: number
  actualMinutes: number
  sessionType: string
  completed: boolean
  createdAt: Timestamp | null
}
