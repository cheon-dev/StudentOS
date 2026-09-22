import type { QuestionFormData } from '../types/reviewer.ts'

export function questionTypeLabel(type: QuestionFormData['type']) { return type === 'multiple_choice' ? 'Multiple choice' : type === 'true_false' ? 'True / False' : 'Identification' }

export function validateQuestion(question: QuestionFormData) {
  if (!question.question.trim()) return 'Enter a question.'
  if (!question.correctAnswer.trim()) return 'Enter the correct answer.'
  if (question.type === 'multiple_choice' && (question.choices.length !== 4 || question.choices.some((choice) => !choice.trim()))) return 'Add four complete choices.'
  if (question.type === 'multiple_choice' && !question.choices.some((choice) => choice.trim() === question.correctAnswer.trim())) return 'The correct answer must match one of the choices.'
  if (question.type === 'true_false' && !['true', 'false'].includes(question.correctAnswer.trim().toLowerCase())) return 'Use True or False as the correct answer.'
  return ''
}

export function parseQuestionImport(input: string) {
  const blocks = input.split(/(?=^\s*\d+\.\s+)/m).map((block) => block.trim()).filter(Boolean)
  return blocks.map((block): QuestionFormData => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    const questionLine = lines.find((line) => /^\d+\.\s+/.test(line)) || lines[0] || ''
    const choices = lines.filter((line) => /^[A-D]\.\s+/i.test(line)).map((line) => line.replace(/^[A-D]\.\s+/i, '').trim())
    const answerLine = lines.find((line) => /^answer\s*:/i.test(line)) || ''
    const answerKey = answerLine.replace(/^answer\s*:\s*/i, '').trim().toUpperCase()
    const answerIndex = ['A', 'B', 'C', 'D'].indexOf(answerKey)
    const explanation = (lines.find((line) => /^explanation\s*:/i.test(line)) || '').replace(/^explanation\s*:\s*/i, '').trim()
    return { type: 'multiple_choice', question: questionLine.replace(/^\d+\.\s+/, '').trim(), choices, correctAnswer: answerIndex >= 0 ? choices[answerIndex] || '' : answerKey, explanation }
  })
}
