import type { Timestamp } from 'firebase/firestore'

export const expenseCategories = ['Food', 'Transportation', 'School', 'Projects', 'Printing', 'Load / Internet', 'Entertainment', 'Shopping', 'Other'] as const
export type ExpenseCategory = (typeof expenseCategories)[number]
export const paymentMethods = ['Cash', 'GCash', 'Maya', 'Bank', 'Card', 'Other'] as const
export type PaymentMethod = (typeof paymentMethods)[number]

export type ExpenseFormData = {
  title: string
  amount: number
  category: ExpenseCategory
  date: string
  description: string
  paymentMethod: PaymentMethod
  subjectId: string | null
  projectId: string | null
}

export type Expense = ExpenseFormData & { id: string; dateTimestamp: Timestamp | null; createdAt: Timestamp | null; updatedAt: Timestamp | null }

export type FinanceSettings = { monthlyBudget: number; updatedAt: Timestamp | null }

export function emptyExpense(): ExpenseFormData {
  return { title: '', amount: 0, category: 'Food', date: new Date().toISOString().slice(0, 10), description: '', paymentMethod: 'Cash', subjectId: null, projectId: null }
}
