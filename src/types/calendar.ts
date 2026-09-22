import type { Timestamp } from 'firebase/firestore'

export const calendarEventTypes = ['Class', 'Meeting', 'Study', 'Personal', 'School Event', 'Other'] as const
export type CalendarEventType = (typeof calendarEventTypes)[number]

export type CalendarEventFormData = {
  title: string
  description: string
  subjectId: string | null
  type: CalendarEventType
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allDay: boolean
  location: string
}

export type CalendarEvent = CalendarEventFormData & {
  id: string
  startAt: Timestamp
  endAt: Timestamp | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export function isCalendarEventType(value: unknown): value is CalendarEventType {
  return typeof value === 'string' && calendarEventTypes.includes(value as CalendarEventType)
}

export function emptyCalendarEvent(): CalendarEventFormData {
  return {
    title: '',
    description: '',
    subjectId: null,
    type: 'Personal',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    location: '',
  }
}
