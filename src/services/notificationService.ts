import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch, type DocumentData, type FirestoreError } from 'firebase/firestore'
import { db } from '../firebase/config.ts'
import type { CalendarEvent } from '../types/calendar.ts'
import type { Project } from '../types/project.ts'
import type { Task } from '../types/task.ts'
import { defaultNotificationPreferences, notificationTypes, type Notification, type NotificationPreferences } from '../types/notification.ts'

const notificationCollection = (uid: string) => collection(db, 'users', uid, 'notifications')
const notificationDocument = (uid: string, id: string) => doc(db, 'users', uid, 'notifications', id)
const preferencesDocument = (uid: string) => doc(db, 'users', uid, 'settings', 'notifications')
const preferencesChangedEvent = 'studentos-notification-preferences-changed'
const timestamp = (data: DocumentData, key: string) => data[key] instanceof Timestamp ? data[key] as Timestamp : null

function mapNotification(id: string, data: DocumentData): Notification { return { id, type: notificationTypes.includes(data.type) ? data.type : 'system', title: typeof data.title === 'string' ? data.title : 'StudentOS notification', message: typeof data.message === 'string' ? data.message : '', relatedType: data.relatedType === 'task' || data.relatedType === 'event' || data.relatedType === 'project' || data.relatedType === 'reviewer' ? data.relatedType : null, relatedId: typeof data.relatedId === 'string' ? data.relatedId : null, read: data.read === true, createdAt: timestamp(data, 'createdAt') } }

export function subscribeToNotifications(uid: string, next: (items: Notification[]) => void, error: (reason: FirestoreError) => void) { return onSnapshot(notificationCollection(uid), (snapshot) => next(snapshot.docs.map((entry) => mapNotification(entry.id, entry.data())).sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))), error) }
export async function markNotificationRead(uid: string, id: string, read = true) { return updateDoc(notificationDocument(uid, id), { read }) }
export async function deleteNotification(uid: string, id: string) { return deleteDoc(notificationDocument(uid, id)) }
export async function markAllNotificationsRead(uid: string) { const snapshot = await getDocs(notificationCollection(uid)); const batch = writeBatch(db); snapshot.docs.filter((entry) => entry.data().read !== true).forEach((entry) => batch.update(entry.ref, { read: true })); return batch.commit() }
export async function getNotificationPreferences(uid: string): Promise<NotificationPreferences> { const snapshot = await getDoc(preferencesDocument(uid)); const data = snapshot.data(); return { taskReminders: data?.taskReminders !== false, overdueAlerts: data?.overdueAlerts !== false, calendarReminders: data?.calendarReminders !== false, projectReminders: data?.projectReminders !== false } }
export async function saveNotificationPreferences(uid: string, preferences: NotificationPreferences) { await setDoc(preferencesDocument(uid), { ...preferences, updatedAt: serverTimestamp() }, { merge: true }); if (typeof window !== 'undefined') window.dispatchEvent(new Event(preferencesChangedEvent)) }
export function onNotificationPreferencesChanged(listener: () => void) { window.addEventListener(preferencesChangedEvent, listener); return () => window.removeEventListener(preferencesChangedEvent, listener) }

function dateKey(date: Date) { return date.toISOString().slice(0, 10) }
function startOfDay(date = new Date()) { const value = new Date(date); value.setHours(0, 0, 0, 0); return value }
function daysFromNow(date: Date, days: number) { const start = startOfDay(); const target = new Date(start); target.setDate(target.getDate() + days); return date >= target && date < new Date(target.getTime() + 24 * 60 * 60 * 1000) }
async function ensureNotification(uid: string, id: string, notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) { const reference = notificationDocument(uid, id); const snapshot = await getDoc(reference); if (!snapshot.exists()) await setDoc(reference, { ...notification, read: false, createdAt: serverTimestamp() }) }

export async function ensureSmartNotifications(uid: string, tasks: Task[], events: CalendarEvent[], projects: Project[], preferences: NotificationPreferences = defaultNotificationPreferences) {
  const pending: Promise<void>[] = []
  const today = startOfDay()
  tasks.filter((task) => task.status !== 'Completed' && task.dueDate).forEach((task) => {
    const dueDate = task.dueDate!.toDate()
    if (preferences.overdueAlerts && dueDate < today) pending.push(ensureNotification(uid, `task_overdue_${task.id}_${dateKey(today)}`, { type: 'overdue', title: 'Task overdue', message: `${task.title} is overdue.`, relatedType: 'task', relatedId: task.id }))
    else if (preferences.taskReminders && daysFromNow(dueDate, 0)) pending.push(ensureNotification(uid, `task_due_${task.id}_${dateKey(today)}`, { type: 'deadline', title: 'Task due today', message: `${task.title} is due today.`, relatedType: 'task', relatedId: task.id }))
    else if (preferences.taskReminders && dueDate > today && dueDate < new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)) pending.push(ensureNotification(uid, `task_upcoming_${task.id}_${dateKey(dueDate)}`, { type: 'deadline', title: 'Upcoming task deadline', message: `${task.title} is due soon.`, relatedType: 'task', relatedId: task.id }))
  })
  if (preferences.calendarReminders) events.forEach((event) => { const start = event.startAt.toDate(); if (start > new Date() && start < new Date(Date.now() + 24 * 60 * 60 * 1000)) pending.push(ensureNotification(uid, `event_upcoming_${event.id}_${dateKey(start)}`, { type: 'event', title: 'Upcoming calendar event', message: `${event.title} starts soon.`, relatedType: 'event', relatedId: event.id })) })
  if (preferences.projectReminders) projects.filter((project) => project.status !== 'Completed' && project.dueDateTimestamp).forEach((project) => { const due = project.dueDateTimestamp!.toDate(); if (due >= today && due < new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000)) pending.push(ensureNotification(uid, `project_due_${project.id}_${dateKey(due)}`, { type: 'project', title: 'Project deadline approaching', message: `${project.name} is due soon.`, relatedType: 'project', relatedId: project.id })) })
  await Promise.all(pending)
}
