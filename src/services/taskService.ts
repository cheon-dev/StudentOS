import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
  type FirestoreError,
} from 'firebase/firestore'
import { db } from '../firebase/config.ts'
import {
  isTaskPriority,
  isTaskStatus,
  isTaskType,
  type Task,
  type TaskFormData,
} from '../types/task.ts'
import { localDateTimeToTimestamp } from '../utils/task.ts'

function tasksCollection(userId: string) {
  return collection(db, 'users', userId, 'tasks')
}

function taskDocument(userId: string, taskId: string) {
  if (!userId || !taskId || taskId.includes('/')) {
    throw new Error('Invalid task reference.')
  }

  return doc(db, 'users', userId, 'tasks', taskId)
}

function readString(data: DocumentData, field: string) {
  return typeof data[field] === 'string' ? data[field] : ''
}

function readNullableString(data: DocumentData, field: string) {
  const value = data[field]
  return typeof value === 'string' && value ? value : null
}

function readNullableNumber(data: DocumentData, field: string) {
  return typeof data[field] === 'number' && Number.isFinite(data[field]) ? data[field] : null
}

function readBoolean(data: DocumentData, field: string) {
  return typeof data[field] === 'boolean' ? data[field] : false
}

function readTimestamp(data: DocumentData, field: string) {
  const value = data[field]

  return value instanceof Timestamp ? value : null
}

function mapTask(id: string, data: DocumentData): Task {
  const dueDateTimestamp = readTimestamp(data, 'dueDate')
  const reminderAt = readTimestamp(data, 'reminderAt')

  return {
    id,
    title: readString(data, 'title'),
    description: readString(data, 'description'),
    subjectId: readNullableString(data, 'subjectId'),
    projectId: readNullableString(data, 'projectId'),
    type: isTaskType(data.type) ? data.type : 'Other',
    priority: isTaskPriority(data.priority) ? data.priority : 'Medium',
    status: isTaskStatus(data.status) ? data.status : 'Pending',
    dueDate: dueDateTimestamp,
    estimatedMinutes: readNullableNumber(data, 'estimatedMinutes'),
    reminderEnabled: readBoolean(data, 'reminderEnabled'),
    reminderAt,
    createdAt: readTimestamp(data, 'createdAt'),
    updatedAt: readTimestamp(data, 'updatedAt'),
    completedAt: readTimestamp(data, 'completedAt'),
  }
}

function taskPayload(task: TaskFormData) {
  return {
    title: task.title.trim(),
    description: task.description.trim(),
    subjectId: task.subjectId || null,
    projectId: task.projectId || null,
    type: task.type,
    priority: task.priority,
    status: task.status,
    dueDate: localDateTimeToTimestamp(task.dueDate, task.dueTime),
    estimatedMinutes: task.estimatedMinutes,
    reminderEnabled: task.reminderEnabled,
    reminderAt: task.reminderEnabled ? localDateTimeToTimestamp(task.reminderDate, task.reminderTime) : null,
  }
}

function completionValue(status: TaskFormData['status']) {
  return status === 'Completed' ? serverTimestamp() : null
}

export function subscribeToTasks(
  userId: string,
  onTasks: (tasks: Task[]) => void,
  onError: (error: FirestoreError) => void,
) {
  return onSnapshot(tasksCollection(userId), (snapshot) => {
    onTasks(snapshot.docs.map((taskSnapshot) => mapTask(taskSnapshot.id, taskSnapshot.data())))
  }, onError)
}

export function subscribeToTask(
  userId: string,
  taskId: string,
  onTask: (task: Task) => void,
  onMissing: () => void,
  onError: (error: FirestoreError) => void,
) {
  return onSnapshot(taskDocument(userId, taskId), (snapshot) => {
    if (!snapshot.exists()) {
      onMissing()
      return
    }

    onTask(mapTask(snapshot.id, snapshot.data()))
  }, onError)
}

export async function getTask(userId: string, taskId: string) {
  const snapshot = await getDoc(taskDocument(userId, taskId))
  return snapshot.exists() ? mapTask(snapshot.id, snapshot.data()) : null
}

export async function createTask(userId: string, task: TaskFormData) {
  return addDoc(tasksCollection(userId), {
    ...taskPayload(task),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: completionValue(task.status),
  })
}

export async function updateTask(userId: string, taskId: string, task: TaskFormData, previousCompletedAt: Timestamp | null = null) {
  await updateDoc(taskDocument(userId, taskId), {
    ...taskPayload(task),
    updatedAt: serverTimestamp(),
    completedAt: task.status === 'Completed' ? previousCompletedAt ?? serverTimestamp() : null,
  })
}

export async function updateTaskStatus(userId: string, taskId: string, status: TaskFormData['status']) {
  await updateDoc(taskDocument(userId, taskId), {
    status,
    updatedAt: serverTimestamp(),
    completedAt: completionValue(status),
  })
}

export async function deleteTask(userId: string, taskId: string) {
  await deleteDoc(taskDocument(userId, taskId))
}
