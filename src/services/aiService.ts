import type { StudentContext } from './studentContextService.ts'
import type { QuestionFormData, QuestionType } from '../types/reviewer.ts'

export type AIProvider = { generateReply: (prompt: string, context: StudentContext) => Promise<string> }

export type AIRequestErrorCode = 'configuration' | 'rate-limit' | 'invalid-response' | 'unavailable' | 'network' | 'bad-request'

export class AIRequestError extends Error {
  public readonly code: AIRequestErrorCode

  constructor(code: AIRequestErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'AIRequestError'
  }
}

export function getAIErrorMessage(reason: unknown, fallback = 'The AI service could not respond right now.') {
  if (reason instanceof AIRequestError) return reason.message
  return fallback
}

function cleanAIReply(value: string) {
  return value.replace(/\*\*/g, '').replace(/__([^_]+)__/g, '$1').trim()
}

async function requestAI<T>(payload: Record<string, unknown>): Promise<T> {
  let response: Response
  try {
    const endpoint = import.meta.env.VITE_AI_API_URL?.trim() || '/api/ai'
    response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  } catch {
    throw new AIRequestError('network', 'The AI backend could not be reached. Check your connection and try again.')
  }
  let body: unknown = null
  try { body = await response.json() } catch { body = null }
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : 'The AI service could not complete that request.'
    const code = body && typeof body === 'object' && 'code' in body && typeof body.code === 'string' ? body.code as AIRequestErrorCode : response.status === 429 ? 'rate-limit' : 'unavailable'
    throw new AIRequestError(code, message)
  }
  return body as T
}

const backendAIProvider: AIProvider = { async generateReply(prompt, context) { const response = await requestAI<{ kind: 'assistant'; reply: string }>({ kind: 'assistant', prompt, context }); if (response.kind !== 'assistant' || typeof response.reply !== 'string') throw new AIRequestError('invalid-response', 'The AI returned an unusable response.') ; return cleanAIReply(response.reply) } }

export function getAIProvider(): AIProvider { return backendAIProvider }
export function isAIConfigured() { return Boolean(import.meta.env.DEV || import.meta.env.VITE_AI_API_URL?.trim()) }

export async function generateReviewerQuestions(topic: string, count: number, questionTypes: QuestionType[]) {
  const response = await requestAI<{ kind: 'reviewer'; questions: QuestionFormData[] }>({ kind: 'reviewer', topic, count, questionTypes })
  if (response.kind !== 'reviewer' || !Array.isArray(response.questions)) throw new AIRequestError('invalid-response', 'The AI returned an unusable question set.')
  return response.questions
}
