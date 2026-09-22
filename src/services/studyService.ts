import { addDoc, collection, onSnapshot, serverTimestamp, Timestamp, type DocumentData, type FirestoreError } from 'firebase/firestore'
import { db } from '../firebase/config.ts'
import type { StudySession } from '../types/studySession.ts'

function sessionsCollection(userId: string) { return collection(db, 'users', userId, 'studySessions') }
function timestamp(data: DocumentData, key: string) { return data[key] instanceof Timestamp ? data[key] as Timestamp : null }
function mapSession(id: string, data: DocumentData): StudySession | null { const startedAt = timestamp(data, 'startedAt'); if (!startedAt) return null; return { id, subjectId: typeof data.subjectId === 'string' ? data.subjectId : null, taskId: typeof data.taskId === 'string' ? data.taskId : null, startedAt, endedAt: timestamp(data, 'endedAt'), plannedMinutes: typeof data.plannedMinutes === 'number' ? data.plannedMinutes : 0, actualMinutes: typeof data.actualMinutes === 'number' ? data.actualMinutes : 0, sessionType: typeof data.sessionType === 'string' ? data.sessionType : 'Pomodoro', completed: data.completed === true, createdAt: timestamp(data, 'createdAt') } }
export function subscribeToStudySessions(userId: string, onSessions: (sessions: StudySession[]) => void, onError: (error: FirestoreError) => void) { return onSnapshot(sessionsCollection(userId), (snapshot) => onSessions(snapshot.docs.map((item) => mapSession(item.id, item.data())).filter((item): item is StudySession => Boolean(item))), onError) }
export async function createStudySession(userId: string, session: Omit<StudySession, 'id' | 'createdAt' | 'endedAt' | 'startedAt'> & { startedAt: Timestamp; endedAt: Timestamp | null }) { return addDoc(sessionsCollection(userId), { ...session, createdAt: serverTimestamp() }) }
