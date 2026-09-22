import { useEffect, useState } from 'react'
import { CalendarDays, FolderKanban, ListTodo, Timer } from 'lucide-react'
import { useAuth } from '../context/useAuth.ts'
import { subscribeToProjects } from '../services/projectService.ts'
import { subscribeToStudySessions } from '../services/studyService.ts'
import { subscribeToSubjects } from '../services/subjectService.ts'
import { subscribeToTasks, updateTaskStatus } from '../services/taskService.ts'
import type { Subject } from '../types/subject.ts'
import type { Task } from '../types/task.ts'
import type { Project } from '../types/project.ts'
import type { StudySession } from '../types/studySession.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { getTaskSortTime, isTaskDueToday, isTaskUpcoming } from '../utils/task.ts'
import { getFirstName } from '../utils/user.ts'
import { ProjectProgress } from '../components/dashboard/ProjectProgress.tsx'
import { QuickActions } from '../components/dashboard/QuickActions.tsx'
import { StatCard } from '../components/dashboard/StatCard.tsx'
import { TodaysTasks } from '../components/dashboard/TodaysTasks.tsx'
import { UpcomingDeadlines } from '../components/dashboard/UpcomingDeadlines.tsx'

function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const { user } = useAuth()
  const userId = user?.uid
  const [tasks, setTasks] = useState<Task[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [taskError, setTaskError] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const now = new Date()

  useEffect(() => {
    if (!userId) return
    return subscribeToTasks(userId, (nextTasks) => {
      setTasks(nextTasks)
      setTasksLoading(false)
    }, (error) => {
      setTaskError(getFirebaseErrorMessage(error, 'Tasks could not be loaded right now.'))
      setTasksLoading(false)
    })
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const projectsUnsubscribe = subscribeToProjects(userId, setProjects, () => setProjects([]))
    const sessionsUnsubscribe = subscribeToStudySessions(userId, setSessions, () => setSessions([]))
    return () => { projectsUnsubscribe(); sessionsUnsubscribe() }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    return subscribeToSubjects(userId, setSubjects, () => setSubjects([]))
  }, [userId])

  const remainingTasks = tasks.filter((task) => task.status !== 'Completed')
  const upcomingTasks = remainingTasks.filter((task) => isTaskUpcoming(task, now)).sort((first, second) => getTaskSortTime(first) - getTaskSortTime(second)).slice(0, 3)
  const todaysTasks = tasks.filter((task) => isTaskDueToday(task, now)).sort((first, second) => getTaskSortTime(first) - getTaskSortTime(second))
  const firstName = getFirstName(user?.displayName)
  const formattedDate = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weeklyStudyMinutes = sessions.filter((session) => session.completed && session.startedAt.toDate() >= weekStart).reduce((total, session) => total + session.actualMinutes, 0)
  const activeProjects = projects.filter((project) => project.status !== 'Completed')
  const stats = [
    { label: 'Tasks Remaining', value: String(remainingTasks.length), detail: `${remainingTasks.filter((task) => isTaskUpcoming(task, now)).length} due this week`, icon: ListTodo, tone: 'purple' as const },
    { label: 'Upcoming Deadlines', value: String(remainingTasks.filter((task) => isTaskUpcoming(task, now)).length), detail: 'Next 7 days', icon: CalendarDays, tone: 'blue' as const },
    { label: 'Active Projects', value: String(activeProjects.length), detail: 'In progress', icon: FolderKanban, tone: 'orange' as const },
    { label: 'Study Time', value: `${Math.floor(weeklyStudyMinutes / 60)}h ${weeklyStudyMinutes % 60}m`, detail: 'This week', icon: Timer, tone: 'green' as const },
  ]

  async function handleStatusChange(task: Task) {
    if (!userId) return
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed'
    try {
      await updateTaskStatus(userId, task.id, nextStatus)
    } catch (error) {
      setTaskError(getFirebaseErrorMessage(error, 'We could not update that task.'))
    }
  }

  return (
    <div className="dashboard-view">
      <section className="dashboard-welcome"><div><p className="dashboard-eyebrow">Sunday reset, one step at a time</p><h1>{getGreeting(now.getHours())}, {firstName} <span aria-hidden="true">👋</span></h1><p className="dashboard-date">{formattedDate}</p></div><span className="dashboard-demo-label">Workspace overview</span></section>
      <section className="stat-grid" aria-label="Workspace summary">{stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}</section>
      <div className="dashboard-grid dashboard-grid--top"><TodaysTasks tasks={todaysTasks} subjects={subjects} loading={tasksLoading} error={taskError} onStatusChange={handleStatusChange} /><UpcomingDeadlines tasks={upcomingTasks} subjects={subjects} loading={tasksLoading} /></div>
      <div className="dashboard-grid dashboard-grid--bottom"><ProjectProgress projects={projects} tasks={tasks} /><QuickActions /></div>
    </div>
  )
}
