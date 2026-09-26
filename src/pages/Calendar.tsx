import { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CalendarEventForm } from '../components/calendar/CalendarEventForm.tsx'
import { Toast } from '../components/subjects/Toast.tsx'
import { useAuth } from '../context/useAuth.ts'
import { subscribeToEvents, createEvent, deleteEvent, updateEvent } from '../services/calendarService.ts'
import { subscribeToSubjects } from '../services/subjectService.ts'
import { subscribeToTasks } from '../services/taskService.ts'
import type { CalendarEvent, CalendarEventFormData } from '../types/calendar.ts'
import type { Subject } from '../types/subject.ts'
import type { Task } from '../types/task.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { addDays, dateKey, dayNameToIndex, formatDayHeading, formatMonth, startOfMonth, startOfWeek, timestampForDateTime } from '../utils/calendar.ts'

type CalendarView = 'month' | 'week' | 'day'
type CalendarSource = 'class' | 'task' | 'event'
type CalendarItem = { id: string; title: string; source: CalendarSource; start: Date; end: Date | null; allDay: boolean; sourceId: string; subjectId: string | null; type: string; location: string }

function scheduleItems(subjects: Subject[], from: Date, to: Date): CalendarItem[] {
  const entries: CalendarItem[] = []
  for (let date = new Date(from); date <= to; date = addDays(date, 1)) {
      subjects.forEach((subject) => subject.schedule.forEach((schedule) => {
       const currentDateKey = dateKey(date)
       if ((subject.startDate && currentDateKey < subject.startDate) || (subject.endDate && currentDateKey > subject.endDate)) return
       if (dayNameToIndex(schedule.day) !== date.getDay()) return
      const startTimestamp = timestampForDateTime(date, schedule.startTime)
      const endTimestamp = timestampForDateTime(date, schedule.endTime)
      if (startTimestamp) entries.push({ id: `class-${subject.id}-${dateKey(date)}-${schedule.startTime}`, title: subject.name, source: 'class', start: startTimestamp.toDate(), end: endTimestamp?.toDate() ?? null, allDay: false, sourceId: subject.id, subjectId: subject.id, type: 'Class', location: subject.room })
    }))
  }
  return entries
}

function calendarItems(subjects: Subject[], tasks: Task[], events: CalendarEvent[], from: Date, to: Date): CalendarItem[] {
  const entries = scheduleItems(subjects, from, to)
  tasks.forEach((task) => { if (task.dueDate && task.dueDate.toDate() >= from && task.dueDate.toDate() <= to) entries.push({ id: `task-${task.id}`, title: task.title, source: 'task', start: task.dueDate.toDate(), end: null, allDay: !task.dueDate.toDate().getHours() && !task.dueDate.toDate().getMinutes(), sourceId: task.id, subjectId: task.subjectId, type: task.type, location: '' }) })
  events.forEach((event) => { if (event.startAt.toDate() >= from && event.startAt.toDate() <= to) entries.push({ id: `event-${event.id}`, title: event.title, source: 'event', start: event.startAt.toDate(), end: event.endAt?.toDate() ?? null, allDay: event.allDay, sourceId: event.id, subjectId: event.subjectId, type: event.type, location: event.location }) })
  return entries.sort((first, second) => first.start.getTime() - second.start.getTime())
}

function entryTime(item: CalendarItem) { return item.allDay ? 'All day' : item.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) }

export function Calendar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const userId = user?.uid
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  useEffect(() => { if (!userId) return; const unsubs = [subscribeToSubjects(userId, setSubjects, () => undefined), subscribeToTasks(userId, setTasks, () => undefined), subscribeToEvents(userId, (nextEvents) => { setEvents(nextEvents); setLoading(false) }, (firestoreError) => { setError(getFirebaseErrorMessage(firestoreError, 'We could not load your calendar events.')); setLoading(false) })]; return () => unsubs.forEach((unsubscribe) => unsubscribe()) }, [userId])

  const monthStart = startOfMonth(currentDate)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = addDays(gridStart, 41)
  const weekStart = startOfWeek(currentDate)
  const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
  const rangeStart = view === 'month' ? gridStart : view === 'week' ? weekStart : new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
  const rangeEnd = view === 'month' ? endOfDay(gridEnd) : view === 'week' ? endOfDay(addDays(weekStart, 6)) : endOfDay(rangeStart)
  const items = calendarItems(subjects, tasks, events, rangeStart, rangeEnd)
  const upcoming = calendarItems(subjects, tasks, events, new Date(), addDays(new Date(), 30)).slice(0, 8)
  const days = view === 'month' ? Array.from({ length: 42 }, (_, index) => addDays(gridStart, index)) : view === 'week' ? Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)) : [currentDate]

  function itemsForDay(day: Date) { return items.filter((item) => dateKey(item.start) === dateKey(day)) }
  function changeDate(amount: number) { setCurrentDate(view === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth() + amount, 1) : addDays(currentDate, view === 'week' ? amount * 7 : amount)) }
  function openCreate(date?: Date) { setEditingEvent(null); setSelectedDate(date); setEventFormOpen(true) }
  function openItem(item: CalendarItem) { if (item.source === 'task') navigate(`/tasks/${item.sourceId}`); else if (item.source === 'class') navigate(`/subjects/${item.sourceId}`); else { const event = events.find((candidate) => candidate.id === item.sourceId); if (event) { setEditingEvent(event); setEventFormOpen(true) } } }
  async function saveEvent(data: CalendarEventFormData) { if (!userId) return; setSaving(true); try { if (editingEvent) { await updateEvent(userId, editingEvent.id, data); setToast({ message: 'Event updated.', tone: 'success' }) } else { await createEvent(userId, data); setToast({ message: 'Event added.', tone: 'success' }) }; setEventFormOpen(false); setEditingEvent(null) } catch (saveError) { setToast({ message: getFirebaseErrorMessage(saveError, 'We could not save this event.'), tone: 'error' }) } finally { setSaving(false) } }
  async function removeEvent(event: CalendarEvent) { if (!userId || !window.confirm(`Delete "${event.title}"?`)) return; try { await deleteEvent(userId, event.id); setToast({ message: 'Event deleted.', tone: 'success' }) } catch (deleteError) { setToast({ message: getFirebaseErrorMessage(deleteError, 'We could not delete this event.'), tone: 'error' }) } }

  return <div className="calendar-page"><section className="module-page-header"><div><p className="dashboard-eyebrow">One view of your week</p><h1>Calendar</h1><p>Classes, deadlines, and the plans you make for yourself.</p></div><button className="primary-button" type="button" onClick={() => openCreate(currentDate)}><Plus size={17} strokeWidth={1.9} /> Add event</button></section>
    <div className="calendar-toolbar"><button className="calendar-today-button" type="button" onClick={() => setCurrentDate(new Date())}>Today</button><div className="calendar-navigation"><button type="button" aria-label="Previous period" onClick={() => changeDate(-1)}><ChevronLeft size={18} /></button><strong>{view === 'month' ? formatMonth(currentDate) : view === 'week' ? `${formatMonth(weekStart)}` : formatDayHeading(currentDate)}</strong><button type="button" aria-label="Next period" onClick={() => changeDate(1)}><ChevronRight size={18} /></button></div><div className="calendar-view-switcher">{(['month', 'week', 'day'] as CalendarView[]).map((option) => <button className={view === option ? 'calendar-view-button calendar-view-button--active' : 'calendar-view-button'} type="button" key={option} onClick={() => setView(option)}>{option}</button>)}</div></div>
    {error ? <section className="subjects-feedback subjects-feedback--error" role="alert"><CalendarDays size={25} /><h2>Calendar unavailable</h2><p>{error}</p></section> : loading ? <div className="calendar-loading">Loading your calendar...</div> : <div className="calendar-layout"><section className={`calendar-board calendar-board--${view}`}><div className="calendar-weekday-row">{(view === 'day' ? [currentDate] : days.slice(0, 7)).map((day) => <span key={dateKey(day)}>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>)}</div><div className="calendar-grid">{days.map((day) => <div className={`calendar-day-cell${day.getMonth() !== currentDate.getMonth() && view === 'month' ? ' calendar-day-cell--muted' : ''}${dateKey(day) === dateKey(new Date()) ? ' calendar-day-cell--today' : ''}`} key={dateKey(day)}><button className="calendar-day-number" type="button" onClick={() => openCreate(day)}>{day.getDate()}</button><div className="calendar-day-items">{itemsForDay(day).map((item) => <button className={`calendar-entry calendar-entry--${item.source}`} type="button" key={item.id} onClick={() => openItem(item)}><strong>{item.title}</strong><span>{entryTime(item)}</span></button>)}</div></div>)}</div></section><aside className="calendar-upcoming"><div className="panel-heading"><div><p className="panel-eyebrow">Next up</p><h2>Upcoming</h2></div><Clock3 size={18} className="panel-heading-arrow" /></div>{upcoming.length === 0 ? <p className="detail-task-muted">No upcoming events.</p> : <div className="upcoming-list">{upcoming.map((item) => <button className="upcoming-item" type="button" key={item.id} onClick={() => openItem(item)}><span className={`upcoming-dot upcoming-dot--${item.source}`} /><span><strong>{item.title}</strong><small>{item.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {entryTime(item)}</small></span></button>)}</div>}</aside></div>}
    {eventFormOpen && <CalendarEventForm event={editingEvent} initialDate={selectedDate} subjects={subjects} saving={saving} onClose={() => setEventFormOpen(false)} onSubmit={saveEvent} onDelete={editingEvent ? () => { void removeEvent(editingEvent); setEventFormOpen(false) } : undefined} />}{toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
  </div>
}
