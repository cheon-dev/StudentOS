import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, updateDoc, type DocumentData, type FirestoreError } from 'firebase/firestore'
import { db } from '../firebase/config.ts'
import type { Note, NoteFormData } from '../types/note.ts'

function notesCollection(userId: string) { return collection(db, 'users', userId, 'notes') }
function noteDocument(userId: string, noteId: string) { return doc(db, 'users', userId, 'notes', noteId) }
function timestamp(data: DocumentData, key: string) { return data[key] instanceof Timestamp ? data[key] as Timestamp : null }
function string(data: DocumentData, key: string) { return typeof data[key] === 'string' ? data[key] : '' }
function mapNote(id: string, data: DocumentData): Note { return { id, title: string(data, 'title'), content: string(data, 'content'), subjectId: typeof data.subjectId === 'string' ? data.subjectId : null, tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : [], isPinned: data.isPinned === true, createdAt: timestamp(data, 'createdAt'), updatedAt: timestamp(data, 'updatedAt') } }
export function subscribeToNotes(userId: string, onNotes: (notes: Note[]) => void, onError: (error: FirestoreError) => void) { return onSnapshot(notesCollection(userId), (snapshot) => onNotes(snapshot.docs.map((item) => mapNote(item.id, item.data()))), onError) }
export async function createNote(userId: string, note: NoteFormData) { return addDoc(notesCollection(userId), { ...note, title: note.title.trim(), content: note.content.trim(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) }
export async function updateNote(userId: string, noteId: string, note: NoteFormData) { await updateDoc(noteDocument(userId, noteId), { ...note, title: note.title.trim(), content: note.content.trim(), updatedAt: serverTimestamp() }) }
export async function deleteNote(userId: string, noteId: string) { await deleteDoc(noteDocument(userId, noteId)) }
