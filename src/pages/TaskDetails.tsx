import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Clock3, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DeleteTaskDialog } from '../components/tasks/DeleteTaskDialog.tsx'
import { TaskForm } from '../components/tasks/TaskForm.tsx'
import { TaskPriorityBadge } from '../components/tasks/TaskPriorityBadge.tsx'
import { TaskStatusBadge } from '../components/tasks/TaskStatusBadge.tsx'
import { Toast } from '../components/subjects/Toast.tsx'
import { useAuth } from '../context/useAuth.ts'
import { subscribeToSubjects } from '../services/subjectService.ts'
import { subscribeToProjects } from '../services/projectService.ts'
import { deleteTask, subscribeToTask, updateTask, updateTaskStatus } from '../services/taskService.ts'
import type { Subject } from '../types/subject.ts'
import type { Project } from '../types/project.ts'
import type { Task, TaskFormData } from '../types/task.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { formatTaskDateTime, isTaskOverdue } from '../utils/task.ts'

export function TaskDetails() {
  const { user } = useAuth()
  const { taskId } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!user?.uid || !taskId || taskId.includes('/')) return

    return subscribeToTask(user.uid, taskId, (nextTask) => {
      setTask(nextTask)
      setLoading(false)
    }, () => {
      setTask(null)
      setLoading(false)
      setError('This task could not be found or may have been removed.')
    }, (firestoreError) => {
      setLoading(false)
      setError(getFirebaseErrorMessage(firestoreError, 'We could not load this task. Please try again.'))
    })
  }, [taskId, user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    return subscribeToSubjects(user.uid, setSubjects, () => setSubjects([]))
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    return subscribeToProjects(user.uid, setProjects, () => setProjects([]))
  }, [user?.uid])

  async function handleSave(taskData: TaskFormData) {
    if (!user?.uid || !task) return
    setSaving(true)

    try {
      await updateTask(user.uid, task.id, taskData, task.completedAt)
      setFormOpen(false)
      setToast({ message: `${taskData.title} was updated.`, tone: 'success' })
    } catch (saveError) {
      setToast({ message: getFirebaseErrorMessage(saveError, 'We could not update that task.'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange() {
    if (!user?.uid || !task) return
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed'

    try {
      await updateTaskStatus(user.uid, task.id, nextStatus)
      setToast({ message: nextStatus === 'Completed' ? 'Task marked complete.' : 'Task reopened.', tone: 'success' })
    } catch (statusError) {
      setToast({ message: getFirebaseErrorMessage(statusError, 'We could not update that task.'), tone: 'error' })
    }
  }

  async function handleDelete() {
    if (!user?.uid || !task) return
    setDeleting(true)

    try {
      await deleteTask(user.uid, task.id)
      navigate('/tasks', { replace: true })
    } catch (deleteError) {
      setToast({ message: getFirebaseErrorMessage(deleteError, 'We could not delete that task.'), tone: 'error' })
      setDeleting(false)
    }
  }

  if (!taskId || taskId.includes('/')) {
    return <TaskMissingState message="This task link is invalid." />
  }

  if (loading) {
    return <div className="subject-details-loading"><div className="detail-skeleton" /><div className="detail-skeleton detail-skeleton--wide" /></div>
  }

  if (error || !task) {
    return <TaskMissingState message={error || 'This task could not be found.'} />
  }

  const subject = task.subjectId ? subjects.find((candidate) => candidate.id === task.subjectId) : undefined
  const project = task.projectId ? projects.find((candidate) => candidate.id === task.projectId) : undefined
  const subjectLabel = subject ? `${subject.name} (${subject.code})` : task.subjectId ? 'Deleted Subject' : 'General'

  return (
    <div className="task-details-page">
      <Link className="back-to-subjects" to="/tasks"><ArrowLeft size={16} strokeWidth={1.8} /> All tasks</Link>
      <section className="task-details-hero">
        <div className="task-details-heading"><span className="task-details-icon"><ClipboardList size={27} strokeWidth={1.8} /></span><div><p className="dashboard-eyebrow">Task details</p><h1>{task.title}</h1><p>{subjectLabel} · {project?.name || (task.projectId ? 'Deleted Project' : 'No project')} · {task.type}</p></div></div>
        <div className="subject-details-actions">
          <button className="secondary-button" type="button" onClick={() => setFormOpen(true)}><Pencil size={15} strokeWidth={1.8} /> Edit</button>
          <button className="danger-outline-button" type="button" onClick={() => setDeleteOpen(true)}><Trash2 size={15} strokeWidth={1.8} /> Delete</button>
        </div>
      </section>
      <section className="task-detail-badges"><TaskPriorityBadge priority={task.priority} /><TaskStatusBadge status={task.status} />{isTaskOverdue(task) && <span className="overdue-label">Overdue</span>}</section>
      <section className="task-detail-content">
        <div className="dashboard-panel task-detail-main-panel">
          <div className="task-detail-info-grid">
            <div><span>Subject</span><strong>{subjectLabel}</strong></div>
            <div><span>Due</span><strong><CalendarClock size={14} />{formatTaskDateTime(task.dueDate)}</strong></div>
            <div><span>Estimated time</span><strong><Clock3 size={14} />{task.estimatedMinutes === null ? 'Not set' : `${task.estimatedMinutes} minutes`}</strong></div>
            <div><span>Reminder</span><strong>{task.reminderEnabled && task.reminderAt ? formatTaskDateTime(task.reminderAt) : 'Off'}</strong></div>
          </div>
          <div className="task-description-block"><p className="panel-eyebrow">Description</p><p>{task.description || 'No description added.'}</p></div>
          <div className="task-record-dates"><span>Created {task.createdAt?.toDate().toLocaleDateString() || 'Recently'}</span>{task.completedAt && <span>Completed {task.completedAt.toDate().toLocaleDateString()}</span>}</div>
        </div>
        <button className={task.status === 'Completed' ? 'secondary-button task-status-action' : 'primary-button task-status-action'} type="button" onClick={handleStatusChange}>
          {task.status === 'Completed' ? <RotateCcw size={16} strokeWidth={1.8} /> : <CheckCircle2 size={16} strokeWidth={1.8} />}
          {task.status === 'Completed' ? 'Reopen task' : 'Mark complete'}
        </button>
      </section>
      {formOpen && <TaskForm task={task} subjects={subjects} projects={projects} saving={saving} onClose={() => setFormOpen(false)} onSubmit={handleSave} />}
      {deleteOpen && <DeleteTaskDialog task={task} deleting={deleting} onCancel={() => setDeleteOpen(false)} onConfirm={handleDelete} />}
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  )
}

function TaskMissingState({ message }: { message: string }) {
  return <section className="subjects-feedback subjects-feedback--error subject-detail-error" role="alert"><ClipboardList size={25} strokeWidth={1.7} /><h2>Task unavailable</h2><p>{message}</p><Link className="secondary-button" to="/tasks"><ArrowLeft size={15} strokeWidth={1.8} /> Back to tasks</Link></section>
}
