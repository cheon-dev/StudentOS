import type { Timestamp } from 'firebase/firestore'

export const questionTypes = ['multiple_choice', 'true_false', 'identification'] as const
export type QuestionType = (typeof questionTypes)[number]

export type ReviewerFormData = {
  title: string
  subjectId: string | null
  description: string
}

export type Reviewer = ReviewerFormData & {
  id: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type QuestionFormData = {
  type: QuestionType
  question: string
  choices: string[]
  correctAnswer: string
  explanation: string
}

export type Question = QuestionFormData & {
  id: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type QuizAnswer = {
  questionId: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
}

export type QuizAttempt = {
  id: string
  reviewerId: string
  subjectId: string | null
  startedAt: Timestamp | null
  completedAt: Timestamp | null
  score: number
  totalQuestions: number
  percentage: number
  answers: QuizAnswer[]
}

export function emptyReviewer(): ReviewerFormData {
  return { title: '', subjectId: null, description: '' }
}

export function emptyQuestion(type: QuestionType = 'multiple_choice'): QuestionFormData {
  return { type, question: '', choices: type === 'multiple_choice' ? ['', '', '', ''] : [], correctAnswer: type === 'true_false' ? 'True' : '', explanation: '' }
}
