import type { Timestamp } from 'firebase/firestore'

export const subjectColors = ['purple', 'blue', 'green', 'orange', 'rose', 'teal'] as const
export type SubjectColor = (typeof subjectColors)[number]

export const subjectIcons = ['book', 'code', 'flask', 'calculator', 'globe', 'palette'] as const
export type SubjectIcon = (typeof subjectIcons)[number]

export const subjectIconLabels: Record<SubjectIcon, string> = {
  book: 'Book',
  code: 'Code',
  flask: 'Science',
  calculator: 'Calculator',
  globe: 'Globe',
  palette: 'Design',
}

export const subjectDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const
export type SubjectDay = (typeof subjectDays)[number]

export type SubjectSchedule = {
  day: SubjectDay
  startTime: string
  endTime: string
}

export type SubjectFormData = {
  name: string
  code: string
  instructor: string
  room: string
  color: SubjectColor
  icon: SubjectIcon
  semester: string
  schoolYear: string
  startDate: string
  endDate: string
  schedule: SubjectSchedule[]
}

export type Subject = SubjectFormData & {
  id: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export function isSubjectColor(value: unknown): value is SubjectColor {
  return typeof value === 'string' && subjectColors.includes(value as SubjectColor)
}

export function isSubjectIcon(value: unknown): value is SubjectIcon {
  return typeof value === 'string' && subjectIcons.includes(value as SubjectIcon)
}

export function isSubjectDay(value: unknown): value is SubjectDay {
  return typeof value === 'string' && subjectDays.includes(value as SubjectDay)
}

export function emptySubjectForm(): SubjectFormData {
  return {
    name: '',
    code: '',
    instructor: '',
    room: '',
    color: 'purple',
    icon: 'book',
    semester: '',
    schoolYear: '',
    startDate: '',
    endDate: '',
    schedule: [],
  }
}
