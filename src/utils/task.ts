import { Timestamp } from 'firebase/firestore'
import type { Task, TaskFormData } from '../types/task.ts'

export function localDateTimeToTimestamp(dateValue: string, timeValue: string) {
  if (!dateValue) {
    return null
  }

  const [year, month, day] = dateValue.split('-').map(Number)
  const [hours = 0, minutes = 0] = timeValue ? timeValue.split(':').map(Number) : []
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0)

  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date)
}

export function timestampToDateInput(timestamp: Timestamp | null) {
  if (!timestamp) {
    return ''
  }

  const date = timestamp.toDate()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function timestampToTimeInput(timestamp: Timestamp | null) {
  if (!timestamp) {
    return ''
  }

  const date = timestamp.toDate()
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatTaskDate(timestamp: Timestamp | null) {
  if (!timestamp) {
    return 'No due date'
  }

  return timestamp.toDate().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTaskDateTime(timestamp: Timestamp | null) {
  if (!timestamp) {
    return 'No due date'
  }

  const date = timestamp.toDate()
  const dateLabel = formatTaskDate(timestamp)
  const timeLabel = date.getHours() === 0 && date.getMinutes() === 0
    ? ''
    : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  return timeLabel ? `${dateLabel} at ${timeLabel}` : dateLabel
}

export function isSameLocalDay(firstDate: Date, secondDate: Date) {
  return firstDate.getFullYear() === secondDate.getFullYear()
    && firstDate.getMonth() === secondDate.getMonth()
    && firstDate.getDate() === secondDate.getDate()
}

export function isTaskDueToday(task: Task, now = new Date()) {
  return task.dueDate ? isSameLocalDay(task.dueDate.toDate(), now) : false
}

export function isTaskOverdue(task: Task, now = new Date()) {
  if (!task.dueDate || task.status === 'Completed') {
    return false
  }

  const dueDate = task.dueDate.toDate()
  const dueTime = dueDate.getHours() === 0 && dueDate.getMinutes() === 0
    ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 23, 59, 59, 999).getTime()
    : dueDate.getTime()

  return dueTime < now.getTime()
}

export function isTaskUpcoming(task: Task, now = new Date()) {
  if (task.status === 'Completed' || !task.dueDate) {
    return false
  }

  const dueDate = task.dueDate.toDate()
  const dueTime = dueDate.getHours() === 0 && dueDate.getMinutes() === 0
    ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 23, 59, 59, 999).getTime()
    : dueDate.getTime()
  const currentTime = now.getTime()
  const sevenDaysFromNow = currentTime + 7 * 24 * 60 * 60 * 1000

  return dueTime >= currentTime && dueTime <= sevenDaysFromNow
}

export function getTaskSortTime(task: Task) {
  return task.dueDate?.toDate().getTime() ?? Number.MAX_SAFE_INTEGER
}

export function getTaskFormData(task: Task): TaskFormData {
  return {
    title: task.title,
    description: task.description,
    subjectId: task.subjectId,
    projectId: task.projectId,
    type: task.type,
    priority: task.priority,
    status: task.status,
    dueDate: timestampToDateInput(task.dueDate),
    dueTime: timestampToTimeInput(task.dueDate),
    estimatedMinutes: task.estimatedMinutes,
    reminderEnabled: task.reminderEnabled,
    reminderDate: timestampToDateInput(task.reminderAt),
    reminderTime: timestampToTimeInput(task.reminderAt),
  }
}
