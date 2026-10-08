import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc, Timestamp, type DocumentData, type FirestoreError } from 'firebase/firestore'
import { db } from '../firebase/config.ts'

export type AssistantMessage = { id: string; role: 'user' | 'assistant'; text: string }
export type AssistantConversation = { id: string; title: string; messages: AssistantMessage[]; createdAt: Timestamp | null; updatedAt: Timestamp | null }

function conversations(uid: string) {
  return collection(db, 'users', uid, 'assistantConversations')
}

function timestamp(data: DocumentData, key: string) {
  return data[key] instanceof Timestamp ? data[key] as Timestamp : null
}

function mapConversation(id: string, data: DocumentData): AssistantConversation {
  const messages = Array.isArray(data.messages)
    ? data.messages.filter((message): message is AssistantMessage => Boolean(message) && typeof message === 'object' && (message.role === 'user' || message.role === 'assistant') && typeof message.id === 'string' && typeof message.text === 'string')
    : []
  return {
    id,
    title: typeof data.title === 'string' && data.title.trim() ? data.title : 'New conversation',
    messages,
    createdAt: timestamp(data, 'createdAt'),
    updatedAt: timestamp(data, 'updatedAt'),
  }
}

export function subscribeToAssistantConversations(uid: string, next: (items: AssistantConversation[]) => void, error: (reason: FirestoreError) => void) {
  return onSnapshot(conversations(uid), (snapshot) => next(snapshot.docs.map((item) => mapConversation(item.id, item.data())).sort((first, second) => (second.updatedAt?.toMillis() ?? 0) - (first.updatedAt?.toMillis() ?? 0))), error)
}

export async function createAssistantConversation(uid: string) {
  const reference = await addDoc(conversations(uid), { title: 'New conversation', messages: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return reference.id
}

export async function saveAssistantConversation(uid: string, id: string, title: string, messages: AssistantMessage[]) {
  await setDoc(doc(db, 'users', uid, 'assistantConversations', id), { title: title.trim() || 'New conversation', messages, updatedAt: serverTimestamp() }, { merge: true })
}
