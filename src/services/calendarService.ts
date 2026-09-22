import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, updateDoc, type DocumentData, type FirestoreError } from 'firebase/firestore'
import { db } from '../firebase/config.ts'
import type { CalendarEvent, CalendarEventFormData } from '../types/calendar.ts'
import { isCalendarEventType } from '../types/calendar.ts'
import { localDateTimeToTimestamp, timestampToDateInput, timestampToTimeInput } from '../utils/task.ts'

function eventsCollection(userId: string) { return collection(db, 'users', userId, 'events') }
function eventDocument(userId: string, eventId: string) { return doc(db, 'users', userId, 'events', eventId) }
function readTimestamp(data: DocumentData, key: string) { return data[key] instanceof Timestamp ? data[key] as Timestamp : null }
function readString(data: DocumentData, key: string) { return typeof data[key] === 'string' ? data[key] : '' }

function mapEvent(id: string, data: DocumentData): CalendarEvent | null {
  const startAt = readTimestamp(data, 'startAt')
  if (!startAt) return null
  const endAt = readTimestamp(data, 'endAt')
  return {
    id, title: readString(data, 'title'), description: readString(data, 'description'), subjectId: typeof data.subjectId === 'string' ? data.subjectId : null,
    type: isCalendarEventType(data.type) ? data.type : 'Other', startAt, endAt, allDay: data.allDay === true, location: readString(data, 'location'),
    startDate: timestampToDateInput(startAt), startTime: timestampToTimeInput(startAt), endDate: timestampToDateInput(endAt), endTime: timestampToTimeInput(endAt),
    createdAt: readTimestamp(data, 'createdAt'), updatedAt: readTimestamp(data, 'updatedAt'),
  }
}

function payload(event: CalendarEventFormData) {
  return { title: event.title.trim(), description: event.description.trim(), subjectId: event.subjectId || null, type: event.type, startAt: localDateTimeToTimestamp(event.startDate, event.allDay ? '' : event.startTime), endAt: event.allDay ? null : localDateTimeToTimestamp(event.endDate || event.startDate, event.endTime), allDay: event.allDay, location: event.location.trim() }
}

export function subscribeToEvents(userId: string, onEvents: (events: CalendarEvent[]) => void, onError: (error: FirestoreError) => void) {
  return onSnapshot(eventsCollection(userId), (snapshot) => onEvents(snapshot.docs.map((item) => mapEvent(item.id, item.data())).filter((item): item is CalendarEvent => Boolean(item))), onError)
}
export async function createEvent(userId: string, event: CalendarEventFormData) { return addDoc(eventsCollection(userId), { ...payload(event), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) }
export async function updateEvent(userId: string, eventId: string, event: CalendarEventFormData) { await updateDoc(eventDocument(userId, eventId), { ...payload(event), updatedAt: serverTimestamp() }) }
export async function deleteEvent(userId: string, eventId: string) { await deleteDoc(eventDocument(userId, eventId)) }
