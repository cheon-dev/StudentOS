import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, ListTodo } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.ts'
import { subscribeToTasks } from '../../services/taskService.ts'
import type { Task } from '../../types/task.ts'
import { getFirebaseErrorMessage } from '../../utils/firebaseError.ts'
import { formatTaskDateTime, isTaskOverdue, isTaskUpcoming } from '../../utils/task.ts'
import { TaskPriorityBadge } from '../tasks/TaskPriorityBadge.tsx'

export function SubjectTasksPreview({ subjectId }: { subjectId: string }) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.uid) return

    return subscribeToTasks(user.uid, (nextTasks) => {
      setTasks(nextTasks.filter((task) => task.subjectId === subjectId).sort((first, second) => {
        if (first.status === 'Completed' && second.status !== 'Completed') return 1
        if (first.status !== 'Completed' && second.status === 'Completed') return -1
        return (first.dueDate?.toMillis() ?? Number.MAX_SAFE_INTEGER) - (second.dueDate?.toMillis() ?? Number.MAX_SAFE_INTEGER)
      }))
      setLoading(false)
    }, (firestoreError) => {
      setError(getFirebaseErrorMessage(firestoreError, 'Tasks could not be loaded right now.'))
      setLoading(false)
    })
  }, [subjectId, user?.uid])

  return (
    <article className="detail-task-card">
      <div className="detail-task-card-heading"><span className="detail-task-icon"><ListTodo size={18} strokeWidth={1.8} /></span><div><p className="panel-eyebrow">Subject work</p><h2>Tasks</h2></div></div>
      {loading ? <p className="detail-task-muted">Loading tasks...</p> : error ? <p className="detail-task-muted">{error}</p> : <>
        <div className="detail-task-counts"><span><strong>{tasks.filter((task) => task.status !== 'Completed').length}</strong> pending</span><span><strong>{tasks.filter((task) => isTaskUpcoming(task)).length}</strong> upcoming</span><span><strong>{tasks.filter((task) => task.status === 'Completed').length}</strong> done</span></div>
        {tasks.length === 0 ? <p className="detail-task-muted">No tasks linked to this subject yet.</p> : <div className="detail-task-list">
          {tasks.slice(0, 3).map((task) => (
            <Link className="detail-task-row" to={`/tasks/${task.id}`} key={task.id}>
              {task.status === 'Completed' ? <CheckCircle2 size={16} className="detail-task-complete" /> : <Circle size={16} />}
              <span><strong>{task.title}</strong><small>{isTaskOverdue(task) ? 'Overdue' : formatTaskDateTime(task.dueDate)}</small></span>
              <TaskPriorityBadge priority={task.priority} />
            </Link>
          ))}
        </div>}
        <Link className="dashboard-panel-link" to={`/tasks?subjectId=${encodeURIComponent(subjectId)}`}>View all tasks</Link>
      </>}
    </article>
  )
}
