import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Bot, CalendarClock, Check, Lightbulb, Plus, Send, Sparkles } from 'lucide-react'
import { useAuth } from '../context/useAuth.ts'
import { subscribeToEvents } from '../services/calendarService.ts'
import { getAIErrorMessage, getAIProvider, isAIConfigured } from '../services/aiService.ts'
import { subscribeToProjects } from '../services/projectService.ts'
import { buildStudentContext } from '../services/studentContextService.ts'
import { subscribeToStudySessions } from '../services/studyService.ts'
import { subscribeToSubjects } from '../services/subjectService.ts'
import { subscribeToTasks } from '../services/taskService.ts'
import { createAssistantConversation, saveAssistantConversation, subscribeToAssistantConversations, type AssistantConversation, type AssistantMessage } from '../services/assistantHistoryService.ts'
import type { CalendarEvent } from '../types/calendar.ts'
import type { Project } from '../types/project.ts'
import type { StudySession } from '../types/studySession.ts'
import type { Subject } from '../types/subject.ts'
import type { Task } from '../types/task.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { isTaskDueToday, isTaskOverdue } from '../utils/task.ts'

const suggestions = ['What tasks are due today?', 'What tasks are overdue?', 'How many active projects do I have?', 'How long did I study today?', 'What subject should I review today?']

function localAnswer(prompt: string, tasks: Task[], subjects: Subject[], projects: Project[], sessions: StudySession[]) {
  const query = prompt.toLowerCase()
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject.name]))
  if (query.includes('due today')) {
    const due = tasks.filter((task) => task.status !== 'Completed' && isTaskDueToday(task))
    return due.length ? `You have ${due.length} task${due.length === 1 ? '' : 's'} due today: ${due.slice(0, 5).map((task) => task.title).join(', ')}.` : 'You have no incomplete tasks due today.'
  }
  if (query.includes('overdue')) {
    const overdue = tasks.filter((task) => isTaskOverdue(task))
    return overdue.length ? `You have ${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}: ${overdue.slice(0, 5).map((task) => task.title).join(', ')}.` : 'You have no overdue tasks.'
  }
  if (query.includes('active project')) {
    const active = projects.filter((project) => project.status !== 'Completed').length
    return `You have ${active} active project${active === 1 ? '' : 's'}.`
  }
  if (query.includes('study') && (query.includes('today') || query.includes('long'))) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const minutes = sessions.filter((session) => session.completed && session.startedAt.toDate() >= start).reduce((sum, session) => sum + session.actualMinutes, 0)
    return `You studied for ${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) === 1 ? '' : 's'} and ${minutes % 60} minutes today.`
  }
  if (query.includes('review') || query.includes('subject')) {
    const due = tasks.filter((task) => task.status !== 'Completed' && task.subjectId).sort((first, second) => (first.dueDate?.toMillis() ?? Number.MAX_SAFE_INTEGER) - (second.dueDate?.toMillis() ?? Number.MAX_SAFE_INTEGER))
    const suggested = due[0]?.subjectId ? subjectMap.get(due[0].subjectId) : subjects[0]?.name
    return suggested ? `Consider reviewing ${suggested}, especially because it has upcoming work.` : 'Create a subject or link a task to one before choosing a review focus.'
  }
  return null
}

function messageId(role: AssistantMessage['role']) {
  return `${Date.now()}-${role}-${Math.random().toString(36).slice(2)}`
}

export function Assistant() {
  const { user } = useAuth()
  const uid = user?.uid
  const historyInitialized = useRef(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [conversations, setConversations] = useState<AssistantConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) return
    const taskUnsubscribe = subscribeToTasks(uid, setTasks, (reason) => setError(getFirebaseErrorMessage(reason, 'Tasks could not be loaded for the assistant.')))
    const subjectUnsubscribe = subscribeToSubjects(uid, setSubjects, (reason) => setError(getFirebaseErrorMessage(reason, 'Subjects could not be loaded for the assistant.')))
    const projectUnsubscribe = subscribeToProjects(uid, setProjects, () => setProjects([]))
    const sessionUnsubscribe = subscribeToStudySessions(uid, setSessions, () => setSessions([]))
    const eventUnsubscribe = subscribeToEvents(uid, setEvents, () => setEvents([]))
    const historyUnsubscribe = subscribeToAssistantConversations(uid, (items) => {
      setConversations(items)
      if (!historyInitialized.current) {
        const first = items[0]
        if (first) {
          setActiveConversationId(first.id)
          setMessages(first.messages)
        }
        historyInitialized.current = true
      }
    }, (reason) => setError(getFirebaseErrorMessage(reason, 'Conversation history could not be loaded.')))
    return () => { taskUnsubscribe(); subjectUnsubscribe(); projectUnsubscribe(); sessionUnsubscribe(); eventUnsubscribe(); historyUnsubscribe() }
  }, [uid])

  const context = buildStudentContext(subjects, tasks, projects, sessions, events)

  function newChat() {
    if (sending) return
    setActiveConversationId(null)
    setMessages([])
    setError('')
  }

  function openConversation(conversation: AssistantConversation) {
    if (sending) return
    setActiveConversationId(conversation.id)
    setMessages(conversation.messages)
    setError('')
  }

  async function sendMessage(value = input) {
    const prompt = value.trim()
    if (!prompt || sending || !uid) return
    setInput('')
    setSending(true)
    const userMessage: AssistantMessage = { id: messageId('user'), role: 'user', text: prompt }
    let conversationId = activeConversationId
    const currentMessages = [...messages, userMessage]
    try {
      if (!conversationId) {
        conversationId = await createAssistantConversation(uid)
        setActiveConversationId(conversationId)
      }
    } catch (reason) {
      setError(getFirebaseErrorMessage(reason, 'Conversation history could not be saved.'))
    }
    setMessages(currentMessages)
    let reply: string
    try {
      const local = localAnswer(prompt, tasks, subjects, projects, sessions)
      reply = local ?? await getAIProvider().generateReply(prompt, context)
    } catch (reason) {
      reply = getAIErrorMessage(reason)
    }
    const nextMessages: AssistantMessage[] = [...currentMessages, { id: messageId('assistant'), role: 'assistant', text: reply }]
    setMessages(nextMessages)
    if (conversationId) {
      await saveAssistantConversation(uid, conversationId, prompt.slice(0, 70), nextMessages).catch((reason) => setError(getFirebaseErrorMessage(reason, 'Conversation history could not be saved.')))
    }
    setSending(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  return <div className="assistant-page"><section className="assistant-layout"><aside className="assistant-sidebar"><div className="assistant-brand"><span><Bot size={21} /></span><div><p className="dashboard-eyebrow">StudentOS</p><h1>Assistant</h1></div></div><button className="primary-button assistant-new-chat" type="button" onClick={newChat}><Plus size={16} /> New chat</button><div className="assistant-history"><p className="assistant-history-label">Conversation history</p>{conversations.length === 0 ? <p className="assistant-history-empty">Your saved conversations will appear here.</p> : conversations.map((conversation) => <button className={conversation.id === activeConversationId ? 'assistant-history-item assistant-history-item--active' : 'assistant-history-item'} type="button" key={conversation.id} onClick={() => openConversation(conversation)}><strong>{conversation.title}</strong><small>{conversation.updatedAt?.toDate().toLocaleDateString() ?? 'Just now'}</small></button>)}</div><div className="assistant-safe-note"><Sparkles size={15} /><p>Simple StudentOS questions are answered locally. Private data such as expenses, inventory, passwords, and local files is not sent to an AI provider.</p></div></aside><section className="assistant-chat"><div className="assistant-chat-header"><div><p className="dashboard-eyebrow">A focused study companion</p><h2>How can I help?</h2></div><span className={isAIConfigured() ? 'assistant-status assistant-status--ready' : 'assistant-status'}>{isAIConfigured() ? 'AI connected' : 'Local mode'}</span></div><div className="assistant-conversation" aria-live="polite">{messages.length === 0 ? <div className="assistant-empty"><div className="assistant-empty-icon"><Lightbulb size={24} /></div><h2>Start with a question</h2><p>Ask about your current StudentOS workspace or choose a prompt below.</p><div className="assistant-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void sendMessage(suggestion)}><CalendarClock size={14} />{suggestion}</button>)}</div></div> : messages.map((message) => <div className={`assistant-message assistant-message--${message.role}`} key={message.id}><span>{message.role === 'assistant' ? <Bot size={15} /> : <Check size={15} />}</span><p>{message.text}</p></div>)}{sending && <div className="assistant-message assistant-message--assistant"><span><Bot size={15} /></span><p>Thinking...</p></div>}</div>{error && <p className="assistant-error">{error}</p>}<div className="assistant-composer"><textarea rows={2} value={input} placeholder="Ask StudentOS something..." aria-label="Message StudentOS assistant" onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} /><button className="primary-button" type="button" disabled={sending || !input.trim()} onClick={() => void sendMessage()}><Send size={16} /> Send</button></div></section></section></div>
}
