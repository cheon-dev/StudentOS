import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import type { CalendarEvent } from '../types/calendar.ts'
import type { NotificationPreferences } from '../types/notification.ts'
import type { Project } from '../types/project.ts'
import type { Task } from '../types/task.ts'

const accessChangedEvent = 'studentos-notification-access-changed'
const channelId = 'studentos-deadlines'
const scheduledIdsKey = 'studentos-native-notification-ids'
const studyTimerNotificationId = 1_987_654_321
const studyTimerCompletionNotificationId = studyTimerNotificationId + 1

export type NotificationAccessState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unsupported'

function isNative() {
  return Capacitor.isNativePlatform()
}

function notifyAccessChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(accessChangedEvent))
}

export function onNotificationAccessChanged(listener: () => void) {
  window.addEventListener(accessChangedEvent, listener)
  return () => window.removeEventListener(accessChangedEvent, listener)
}

export async function getNotificationAccess(): Promise<NotificationAccessState> {
  if (!isNative()) return 'unsupported'
  return (await LocalNotifications.checkPermissions()).display
}

export async function requestNotificationAccess(): Promise<NotificationAccessState> {
  if (!isNative()) return 'unsupported'

  const status = await LocalNotifications.requestPermissions()
  if (status.display === 'granted') {
    await LocalNotifications.createChannel({
      id: channelId,
      name: 'StudentOS deadlines',
      description: 'Deadlines and reminders from your StudentOS workspace.',
      importance: 4,
      visibility: 1,
      vibration: true,
    })
  }
  notifyAccessChanged()
  return status.display
}

function readScheduledIds() {
  try {
    const value = JSON.parse(window.localStorage.getItem(scheduledIdsKey) || '[]')
    return Array.isArray(value) ? value.filter((id): id is number => typeof id === 'number') : []
  } catch {
    return []
  }
}

function writeScheduledIds(ids: number[]) {
  window.localStorage.setItem(scheduledIdsKey, JSON.stringify(ids))
}

function notificationId(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  return Math.abs(hash % 2_000_000_000) + 1
}

function addNotification(notifications: LocalNotificationSchema[], key: string, title: string, body: string, at: Date, relatedId: string) {
  if (at.getTime() <= Date.now()) return
  notifications.push({
    id: notificationId(key),
    title,
    body,
    channelId,
    autoCancel: true,
    isExactNotification: false,
    extra: { relatedId },
    schedule: { at },
  })
}

async function cancelPreviouslyScheduled() {
  const ids = readScheduledIds()
  if (ids.length > 0) await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) })
  writeScheduledIds([])
}

async function ensureNotificationChannel() {
  await LocalNotifications.createChannel({
    id: channelId,
    name: 'StudentOS deadlines',
    description: 'Deadlines and reminders from your StudentOS workspace.',
    importance: 4,
    visibility: 1,
    vibration: true,
  })
}

export async function syncStudyTimerNotification(timer: { endAt: number; preset: string } | null) {
  if (!isNative()) return

  await LocalNotifications.cancel({ notifications: [{ id: studyTimerNotificationId }, { id: studyTimerCompletionNotificationId }] })
  if (!timer || timer.endAt <= Date.now() || (await getNotificationAccess()) !== 'granted') return

  await ensureNotificationChannel()
  const endTime = new Date(timer.endAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  await LocalNotifications.schedule({ notifications: [
    {
      id: studyTimerNotificationId,
      title: 'Study timer running',
      body: `${timer.preset} session ends at ${endTime}.`,
      channelId,
      ongoing: true,
      autoCancel: false,
      isExactNotification: false,
      extra: { relatedId: 'study-timer' },
      schedule: { at: new Date(Date.now() + 100) },
    },
    {
      id: studyTimerCompletionNotificationId,
      title: 'Study timer complete',
      body: `${timer.preset} session finished. Nice work!`,
      channelId,
      autoCancel: true,
      isExactNotification: false,
      extra: { relatedId: 'study-timer' },
      schedule: { at: new Date(timer.endAt), allowWhileIdle: true },
    },
  ] })
}

export async function syncNativeNotifications(
  tasks: Task[],
  events: CalendarEvent[],
  projects: Project[],
  preferences: NotificationPreferences,
) {
  if (!isNative()) return

  await cancelPreviouslyScheduled()
  if ((await getNotificationAccess()) !== 'granted') return

  await ensureNotificationChannel()

  const notifications: LocalNotificationSchema[] = []
  if (preferences.taskReminders) {
    tasks.filter((task) => task.status !== 'Completed').forEach((task) => {
      if (task.reminderEnabled && task.reminderAt) {
        addNotification(notifications, `task-reminder-${task.id}`, 'Task reminder', `${task.title} is coming up.`, task.reminderAt.toDate(), task.id)
      }
      if (task.dueDate) {
        addNotification(notifications, `task-deadline-${task.id}`, 'Task deadline', `${task.title} is due now.`, task.dueDate.toDate(), task.id)
      }
    })
  }
  if (preferences.calendarReminders) {
    events.forEach((event) => addNotification(notifications, `event-${event.id}`, 'Upcoming calendar event', `${event.title} starts now.`, event.startAt.toDate(), event.id))
  }
  if (preferences.projectReminders) {
    projects.filter((project) => project.status !== 'Completed' && project.dueDateTimestamp).forEach((project) => {
      addNotification(notifications, `project-${project.id}`, 'Project deadline', `${project.name} is due now.`, project.dueDateTimestamp!.toDate(), project.id)
    })
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications })
    writeScheduledIds(notifications.map((notification) => notification.id))
  }
}
