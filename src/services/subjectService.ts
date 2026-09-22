import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type FirestoreError,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config.ts'
import {
  isSubjectColor,
  isSubjectDay,
  isSubjectIcon,
  type Subject,
  type SubjectFormData,
  type SubjectSchedule,
} from '../types/subject.ts'

function subjectsCollection(userId: string) {
  return collection(db, 'users', userId, 'subjects')
}

function subjectDocument(userId: string, subjectId: string) {
  if (!userId || !subjectId || subjectId.includes('/')) {
    throw new Error('Invalid subject reference.')
  }

  return doc(db, 'users', userId, 'subjects', subjectId)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readSchedule(value: unknown): SubjectSchedule[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry) || !isSubjectDay(entry.day) || typeof entry.startTime !== 'string' || typeof entry.endTime !== 'string') {
      return []
    }

    return [{ day: entry.day, startTime: entry.startTime, endTime: entry.endTime }]
  })
}

function readString(data: DocumentData, field: string) {
  return typeof data[field] === 'string' ? data[field] : ''
}

function readTimestamp(value: unknown) {
  return value && typeof value === 'object' && 'toMillis' in value
    ? value as Timestamp
    : null
}

function mapSubject(id: string, data: DocumentData): Subject {
  return {
    id,
    name: readString(data, 'name'),
    code: readString(data, 'code'),
    instructor: readString(data, 'instructor'),
    room: readString(data, 'room'),
    color: isSubjectColor(data.color) ? data.color : 'purple',
    icon: isSubjectIcon(data.icon) ? data.icon : 'book',
    semester: readString(data, 'semester'),
    schoolYear: readString(data, 'schoolYear'),
    schedule: readSchedule(data.schedule),
    createdAt: readTimestamp(data.createdAt),
    updatedAt: readTimestamp(data.updatedAt),
  }
}

function subjectPayload(subject: SubjectFormData) {
  return {
    name: subject.name.trim(),
    code: subject.code.trim(),
    instructor: subject.instructor.trim(),
    room: subject.room.trim(),
    color: subject.color,
    icon: subject.icon,
    semester: subject.semester.trim(),
    schoolYear: subject.schoolYear.trim(),
    schedule: subject.schedule,
  }
}

export function subscribeToSubjects(
  userId: string,
  onSubjects: (subjects: Subject[]) => void,
  onError: (error: FirestoreError) => void,
) {
  return onSnapshot(subjectsCollection(userId), (snapshot) => {
    const subjects = snapshot.docs
      .map((subjectSnapshot) => mapSubject(subjectSnapshot.id, subjectSnapshot.data()))
      .sort((firstSubject, secondSubject) => firstSubject.name.localeCompare(secondSubject.name))

    onSubjects(subjects)
  }, onError)
}

export function subscribeToSubject(
  userId: string,
  subjectId: string,
  onSubject: (subject: Subject) => void,
  onMissing: () => void,
  onError: (error: FirestoreError) => void,
) {
  return onSnapshot(subjectDocument(userId, subjectId), (snapshot) => {
    if (!snapshot.exists()) {
      onMissing()
      return
    }

    onSubject(mapSubject(snapshot.id, snapshot.data()))
  }, onError)
}

export async function createSubject(userId: string, subject: SubjectFormData) {
  return addDoc(subjectsCollection(userId), {
    ...subjectPayload(subject),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateSubject(userId: string, subjectId: string, subject: SubjectFormData) {
  await updateDoc(subjectDocument(userId, subjectId), {
    ...subjectPayload(subject),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteSubject(userId: string, subjectId: string) {
  await deleteDoc(subjectDocument(userId, subjectId))
}
