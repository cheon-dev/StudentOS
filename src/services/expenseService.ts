import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, updateDoc, getDoc, setDoc, type DocumentData, type FirestoreError } from 'firebase/firestore'
import { db } from '../firebase/config.ts'
import { expenseCategories, paymentMethods, type Expense, type ExpenseFormData, type FinanceSettings } from '../types/expense.ts'

const expenses = (uid: string) => collection(db, 'users', uid, 'expenses')
const expense = (uid: string, id: string) => doc(db, 'users', uid, 'expenses', id)
const finance = (uid: string) => doc(db, 'users', uid, 'settings', 'finance')
const timestamp = (data: DocumentData, key: string) => data[key] instanceof Timestamp ? data[key] as Timestamp : null
const string = (data: DocumentData, key: string) => typeof data[key] === 'string' ? data[key] : ''
const nullableString = (data: DocumentData, key: string) => typeof data[key] === 'string' && data[key] ? data[key] as string : null
function dateValue(date: string) { const parsed = new Date(`${date}T12:00:00`); return Number.isNaN(parsed.getTime()) ? null : Timestamp.fromDate(parsed) }
function mapExpense(id: string, data: DocumentData): Expense { return { id, title: string(data, 'title'), amount: typeof data.amount === 'number' && Number.isFinite(data.amount) ? Math.max(0, data.amount) : 0, category: expenseCategories.includes(data.category) ? data.category : 'Other', date: timestamp(data, 'date')?.toDate().toISOString().slice(0, 10) ?? '', dateTimestamp: timestamp(data, 'date'), description: string(data, 'description'), paymentMethod: paymentMethods.includes(data.paymentMethod) ? data.paymentMethod : 'Other', subjectId: nullableString(data, 'subjectId'), projectId: nullableString(data, 'projectId'), createdAt: timestamp(data, 'createdAt'), updatedAt: timestamp(data, 'updatedAt') } }
function payload(data: ExpenseFormData) { return { title: data.title.trim(), amount: Math.max(0, Number(data.amount) || 0), category: data.category, date: dateValue(data.date), description: data.description.trim(), paymentMethod: data.paymentMethod, subjectId: data.subjectId || null, projectId: data.projectId || null } }
export function subscribeToExpenses(uid: string, next: (items: Expense[]) => void, error: (reason: FirestoreError) => void) { return onSnapshot(expenses(uid), (snapshot) => next(snapshot.docs.map((item) => mapExpense(item.id, item.data())).sort((a, b) => (b.dateTimestamp?.toMillis() ?? 0) - (a.dateTimestamp?.toMillis() ?? 0))), error) }
export async function createExpense(uid: string, data: ExpenseFormData) { return addDoc(expenses(uid), { ...payload(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) }
export async function updateExpense(uid: string, id: string, data: ExpenseFormData) { return updateDoc(expense(uid, id), { ...payload(data), updatedAt: serverTimestamp() }) }
export async function deleteExpense(uid: string, id: string) { return deleteDoc(expense(uid, id)) }
export async function getFinanceSettings(uid: string): Promise<FinanceSettings> { const snapshot = await getDoc(finance(uid)); const data = snapshot.data(); return { monthlyBudget: typeof data?.monthlyBudget === 'number' ? Math.max(0, data.monthlyBudget) : 0, updatedAt: data?.updatedAt instanceof Timestamp ? data.updatedAt : null } }
export async function saveFinanceSettings(uid: string, monthlyBudget: number) { return setDoc(finance(uid), { monthlyBudget: Math.max(0, Number(monthlyBudget) || 0), updatedAt: serverTimestamp() }, { merge: true }) }
