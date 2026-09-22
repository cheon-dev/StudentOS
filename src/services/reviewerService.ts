import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, Timestamp, updateDoc, type DocumentData, type FirestoreError } from 'firebase/firestore'
import { db } from '../firebase/config.ts'
import { questionTypes, type Question, type QuestionFormData, type Reviewer, type ReviewerFormData } from '../types/reviewer.ts'

const reviewers = (uid: string) => collection(db, 'users', uid, 'reviewers')
const reviewer = (uid: string, reviewerId: string) => doc(db, 'users', uid, 'reviewers', reviewerId)
const questions = (uid: string, reviewerId: string) => collection(db, 'users', uid, 'reviewers', reviewerId, 'questions')
const question = (uid: string, reviewerId: string, questionId: string) => doc(db, 'users', uid, 'reviewers', reviewerId, 'questions', questionId)
const timestamp = (data: DocumentData, key: string) => data[key] instanceof Timestamp ? data[key] as Timestamp : null
const string = (data: DocumentData, key: string) => typeof data[key] === 'string' ? data[key] : ''
const nullableString = (data: DocumentData, key: string) => typeof data[key] === 'string' && data[key] ? data[key] as string : null

function mapReviewer(id: string, data: DocumentData): Reviewer { return { id, title: string(data, 'title'), subjectId: nullableString(data, 'subjectId'), description: string(data, 'description'), createdAt: timestamp(data, 'createdAt'), updatedAt: timestamp(data, 'updatedAt') } }
function mapQuestion(id: string, data: DocumentData): Question { const choices = Array.isArray(data.choices) ? data.choices.filter((choice): choice is string => typeof choice === 'string') : []; return { id, type: questionTypes.includes(data.type) ? data.type : 'identification', question: string(data, 'question'), choices, correctAnswer: string(data, 'correctAnswer'), explanation: string(data, 'explanation'), createdAt: timestamp(data, 'createdAt'), updatedAt: timestamp(data, 'updatedAt') } }
function reviewerPayload(data: ReviewerFormData) { return { title: data.title.trim(), subjectId: data.subjectId || null, description: data.description.trim() } }
function questionPayload(data: QuestionFormData) { return { type: data.type, question: data.question.trim(), choices: data.type === 'multiple_choice' ? data.choices.map((choice) => choice.trim()) : [], correctAnswer: data.correctAnswer.trim(), explanation: data.explanation.trim() } }

export function subscribeToReviewers(uid: string, next: (items: Reviewer[]) => void, error: (reason: FirestoreError) => void) { return onSnapshot(reviewers(uid), (snapshot) => next(snapshot.docs.map((entry) => mapReviewer(entry.id, entry.data())).sort((a, b) => a.title.localeCompare(b.title))), error) }
export function subscribeToReviewer(uid: string, reviewerId: string, next: (item: Reviewer | null) => void, error: (reason: FirestoreError) => void) { return onSnapshot(reviewer(uid, reviewerId), (snapshot) => next(snapshot.exists() ? mapReviewer(snapshot.id, snapshot.data()) : null), error) }
export function subscribeToQuestions(uid: string, reviewerId: string, next: (items: Question[]) => void, error: (reason: FirestoreError) => void) { return onSnapshot(questions(uid, reviewerId), (snapshot) => next(snapshot.docs.map((entry) => mapQuestion(entry.id, entry.data())).sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0))), error) }
export async function getQuestions(uid: string, reviewerId: string) { const snapshot = await getDocs(questions(uid, reviewerId)); return snapshot.docs.map((entry) => mapQuestion(entry.id, entry.data())) }
export async function createReviewer(uid: string, data: ReviewerFormData) { return addDoc(reviewers(uid), { ...reviewerPayload(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) }
export async function updateReviewer(uid: string, reviewerId: string, data: ReviewerFormData) { return updateDoc(reviewer(uid, reviewerId), { ...reviewerPayload(data), updatedAt: serverTimestamp() }) }
export async function deleteReviewer(uid: string, reviewerId: string) { const snapshot = await getDocs(questions(uid, reviewerId)); await Promise.all(snapshot.docs.map((entry) => deleteDoc(entry.ref))); return deleteDoc(reviewer(uid, reviewerId)) }
export async function createQuestion(uid: string, reviewerId: string, data: QuestionFormData) { return addDoc(questions(uid, reviewerId), { ...questionPayload(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) }
export async function updateQuestion(uid: string, reviewerId: string, questionId: string, data: QuestionFormData) { return updateDoc(question(uid, reviewerId, questionId), { ...questionPayload(data), updatedAt: serverTimestamp() }) }
export async function deleteQuestion(uid: string, reviewerId: string, questionId: string) { return deleteDoc(question(uid, reviewerId, questionId)) }
