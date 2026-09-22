import type { Timestamp } from 'firebase/firestore'

export const notificationTypes = ['deadline', 'overdue', 'event', 'study', 'project', 'system'] as const
export type NotificationType = (typeof notificationTypes)[number]
export type NotificationRelatedType = 'task' | 'event' | 'project' | 'reviewer' | null
export type Notification = { id: string; type: NotificationType; title: string; message: string; relatedType: NotificationRelatedType; relatedId: string | null; read: boolean; createdAt: Timestamp | null }
export type NotificationPreferences = { taskReminders: boolean; overdueAlerts: boolean; calendarReminders: boolean; projectReminders: boolean }
export const defaultNotificationPreferences: NotificationPreferences = { taskReminders: true, overdueAlerts: true, calendarReminders: true, projectReminders: true }
