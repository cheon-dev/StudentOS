import type { Timestamp } from 'firebase/firestore'

export const taskTypes = ['Assignment', 'Activity', 'Project', 'Quiz', 'Exam', 'Study', 'Personal', 'Other'] as const
export type TaskType = (typeof taskTypes)[number]

export const taskPriorities = ['Low', 'Medium', 'High', 'Urgent'] as const
export type TaskPriority = (typeof taskPriorities)[number]

export const taskStatuses = ['Pending', 'In Progress', 'Completed'] as const
export type TaskStatus = (typeof taskStatuses)[number]

export type TaskFormData = {
  title: string
  description: string
  subjectId: string | null
  projectId: string | null
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  dueDate: string
  dueTime: string
  estimatedMinutes: number | null
  reminderEnabled: boolean
  reminderDate: string
  reminderTime: string
}

export type Task = {
  id: string
  title: string
  description: string
  subjectId: string | null
  projectId: string | null
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  dueDate: Timestamp | null
  estimatedMinutes: number | null
  reminderEnabled: boolean
  reminderAt: Timestamp | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  completedAt: Timestamp | null
}

export function isTaskType(value: unknown): value is TaskType {
  return typeof value === 'string' && taskTypes.includes(value as TaskType)
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && taskPriorities.includes(value as TaskPriority)
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && taskStatuses.includes(value as TaskStatus)
}

export function emptyTaskForm(): TaskFormData {
  return {
    title: '',
    description: '',
    subjectId: null,
    projectId: null,
    type: 'Assignment',
    priority: 'Medium',
    status: 'Pending',
    dueDate: '',
    dueTime: '',
    estimatedMinutes: null,
    reminderEnabled: false,
    reminderDate: '',
    reminderTime: '',
  }
}
