import type { Timestamp } from 'firebase/firestore'

export const projectCategories = ['Academic', 'Capstone', 'Programming', 'Personal', 'Other'] as const
export type ProjectCategory = (typeof projectCategories)[number]
export const projectStatuses = ['Planning', 'In Progress', 'On Hold', 'Completed'] as const
export type ProjectStatus = (typeof projectStatuses)[number]
export const projectPriorities = ['Low', 'Medium', 'High', 'Urgent'] as const
export type ProjectPriority = (typeof projectPriorities)[number]

export type ProjectFormData = {
  name: string
  description: string
  category: ProjectCategory
  status: ProjectStatus
  priority: ProjectPriority
  startDate: string
  dueDate: string
  progress: number
  subjectId: string | null
}

export type Project = ProjectFormData & {
  id: string
  startDateTimestamp: Timestamp | null
  dueDateTimestamp: Timestamp | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  completedAt: Timestamp | null
}

export function emptyProject(): ProjectFormData {
  return { name: '', description: '', category: 'Academic', status: 'Planning', priority: 'Medium', startDate: '', dueDate: '', progress: 0, subjectId: null }
}
