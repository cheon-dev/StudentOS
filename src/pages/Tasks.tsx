import { useEffect, useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { DeleteTaskDialog } from '../components/tasks/DeleteTaskDialog.tsx'
import { TaskCard } from '../components/tasks/TaskCard.tsx'
import { TaskFilters, type TaskFilterValues, type TaskSort, type TaskViewFilter } from '../components/tasks/TaskFilters.tsx'
import { TaskForm } from '../components/tasks/TaskForm.tsx'
import { Toast } from '../components/subjects/Toast.tsx'
import { useAuth } from '../context/useAuth.ts'
import { subscribeToSubjects } from '../services/subjectService.ts'
import { subscribeToProjects } from '../services/projectService.ts'
import { createTask, deleteTask, subscribeToTasks, updateTask, updateTaskStatus } from '../services/taskService.ts'
import type { Subject } from '../types/subject.ts'
import type { Project } from '../types/project.ts'
import type { Task, TaskFormData } from '../types/task.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { getTaskSortTime, isTaskDueToday, isTaskOverdue, isTaskUpcoming } from '../utils/task.ts'

const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 }

function compareTasks(firstTask: Task, secondTask: Task, sort: TaskSort) {
  if (sort === 'title') {
    return firstTask.title.localeCompare(secondTask.title)
  }

  if (sort === 'priority') {
    return priorityOrder[firstTask.priority] - priorityOrder[secondTask.priority]
  }

  if (sort === 'created') {
    return (secondTask.createdAt?.toMillis() ?? 0) - (firstTask.createdAt?.toMillis() ?? 0)
  }

  const dueDifference = getTaskSortTime(firstTask) - getTaskSortTime(secondTask)

  if (sort === 'due') return dueDifference

  if (sort === 'default') {
    if (firstTask.status === 'Completed' && secondTask.status !== 'Completed') return 1
    if (firstTask.status !== 'Completed' && secondTask.status === 'Completed') return -1
  }

  return dueDifference || firstTask.title.localeCompare(secondTask.title)
}

export function Tasks() {
  const { user } = useAuth()
  const userId = user?.uid
  const [searchParams] = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const requestedView = searchParams.get('view')
  const initialView: TaskViewFilter = requestedView === 'pending' || requestedView === 'in-progress' || requestedView === 'completed' || requestedView === 'overdue' || requestedView === 'today' || requestedView === 'upcoming' ? requestedView : 'all'
  const requestedProjectId = searchParams.get('projectId')
  const [filterView, setFilterView] = useState<TaskViewFilter>(initialView)
  const [filters, setFilters] = useState<TaskFilterValues>(() => ({
    search: '',
    status: 'all',
    priority: 'all',
    subjectId: searchParams.get('subjectId') || 'all',
    type: 'all',
    sort: 'default',
  }))
  const [formOpen, setFormOpen] = useState(() => searchParams.get('new') === 'true')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!userId) {
      return
    }

    return subscribeToTasks(
      userId,
      (nextTasks) => {
        setTasks(nextTasks)
        setLoading(false)
      },
      (error) => {
        setLoadError(getFirebaseErrorMessage(error, 'We could not load your tasks. Please try again.'))
        setLoading(false)
      },
    )
  }, [userId])

  useEffect(() => {
    if (!userId) return
    return subscribeToProjects(userId, setProjects, () => setProjects([]))
  }, [userId])

  useEffect(() => {
    if (!userId) {
      return
    }

    return subscribeToSubjects(
      userId,
      setSubjects,
      () => setSubjects([]),
    )
  }, [userId])

  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]))
  const now = new Date()
  const counts: Record<TaskViewFilter, number> = {
    all: tasks.length,
    pending: tasks.filter((task) => task.status === 'Pending').length,
    'in-progress': tasks.filter((task) => task.status === 'In Progress').length,
    completed: tasks.filter((task) => task.status === 'Completed').length,
    overdue: tasks.filter((task) => isTaskOverdue(task, now)).length,
    today: tasks.filter((task) => isTaskDueToday(task, now)).length,
    upcoming: tasks.filter((task) => isTaskUpcoming(task, now)).length,
  }
  const normalizedSearch = filters.search.trim().toLowerCase()
  const visibleTasks = tasks
    .filter((task) => {
      const subject = task.subjectId ? subjectMap.get(task.subjectId) : undefined
      const project = task.projectId ? projects.find((candidate) => candidate.id === task.projectId) : undefined
      const searchableText = [task.title, task.description, subject?.name || '', subject?.code || '', project?.name || ''].join(' ').toLowerCase()
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch)
      const matchesView = filterView === 'all'
        || (filterView === 'pending' && task.status === 'Pending')
        || (filterView === 'in-progress' && task.status === 'In Progress')
        || (filterView === 'completed' && task.status === 'Completed')
        || (filterView === 'overdue' && isTaskOverdue(task, now))
        || (filterView === 'today' && isTaskDueToday(task, now))
        || (filterView === 'upcoming' && isTaskUpcoming(task, now))
      const matchesStatus = filters.status === 'all' || task.status === filters.status
      const matchesPriority = filters.priority === 'all' || task.priority === filters.priority
      const matchesSubject = filters.subjectId === 'all'
        || (filters.subjectId === 'general' && !task.subjectId)
        || task.subjectId === filters.subjectId
      const matchesType = filters.type === 'all' || task.type === filters.type

      return matchesSearch && matchesView && matchesStatus && matchesPriority && matchesSubject && matchesType
    })
    .sort((firstTask, secondTask) => compareTasks(firstTask, secondTask, filters.sort))

  function updateFilter(field: keyof TaskFilterValues, value: string) {
    setFilters((current) => ({ ...current, [field]: value }) as TaskFilterValues)
  }

  function clearFilters() {
    setFilterView('all')
    setFilters({ search: '', status: 'all', priority: 'all', subjectId: 'all', type: 'all', sort: 'default' })
  }

  function openCreateForm() {
    setEditingTask(null)
    setFormOpen(true)
  }

  function openEditForm(task: Task) {
    setEditingTask(task)
    setFormOpen(true)
  }

  async function handleSave(taskData: TaskFormData) {
    if (!userId) {
      return
    }

    setSaving(true)

    try {
      if (editingTask) {
        await updateTask(userId, editingTask.id, taskData, editingTask.completedAt)
        setToast({ message: `${taskData.title} was updated.`, tone: 'success' })
      } else {
        await createTask(userId, taskData)
        setToast({ message: `${taskData.title} was added to your tasks.`, tone: 'success' })
      }
      setFormOpen(false)
      setEditingTask(null)
    } catch (saveError) {
      setToast({ message: getFirebaseErrorMessage(saveError, `We could not ${editingTask ? 'update' : 'create'} that task.`), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(task: Task) {
    if (!userId) {
      return
    }

    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed'

    try {
      await updateTaskStatus(userId, task.id, nextStatus)
      setToast({ message: nextStatus === 'Completed' ? 'Task marked complete.' : 'Task reopened.', tone: 'success' })
    } catch (statusError) {
      setToast({ message: getFirebaseErrorMessage(statusError, 'We could not update that task.'), tone: 'error' })
    }
  }

  async function handleDelete() {
    if (!userId || !deleteTarget) {
      return
    }

    setDeleting(true)

    try {
      await deleteTask(userId, deleteTarget.id)
      setDeleteTarget(null)
      setToast({ message: `${deleteTarget.title} was deleted.`, tone: 'success' })
    } catch (deleteError) {
      setToast({ message: getFirebaseErrorMessage(deleteError, 'We could not delete that task.'), tone: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="tasks-page">
      <section className="module-page-header">
        <div>
          <p className="dashboard-eyebrow">Keep moving forward</p>
          <h1>Tasks &amp; Deadlines</h1>
          <p>Stay organized and keep track of your academic and personal work.</p>
        </div>
        <button className="primary-button" type="button" onClick={openCreateForm}><Plus size={17} strokeWidth={1.9} /> Add task</button>
      </section>

      <TaskFilters values={filters} subjects={subjects} view={filterView} counts={counts} onViewChange={setFilterView} onChange={updateFilter} onClear={clearFilters} />

      {loadError ? (
        <section className="subjects-feedback subjects-feedback--error" role="alert">
          <ClipboardList size={25} strokeWidth={1.7} />
          <h2>Tasks are unavailable</h2>
          <p>{loadError}</p>
        </section>
      ) : loading ? (
        <div className="task-list-page-skeleton" aria-label="Loading tasks">
          {Array.from({ length: 4 }, (_, index) => <div className="task-card task-card--skeleton" key={index} />)}
        </div>
      ) : tasks.length === 0 ? (
        <section className="subjects-feedback">
          <div className="empty-subject-icon"><ClipboardList size={27} strokeWidth={1.7} /></div>
          <p className="dashboard-eyebrow">A clear list feels good</p>
          <h2>No tasks yet</h2>
          <p>Create your first task to start organizing your deadlines.</p>
          <button className="primary-button" type="button" onClick={openCreateForm}><Plus size={17} strokeWidth={1.9} /> Add task</button>
        </section>
      ) : visibleTasks.length === 0 ? (
        <section className="subjects-feedback">
          <div className="empty-subject-icon"><ClipboardList size={25} strokeWidth={1.7} /></div>
          <h2>No tasks match your filters</h2>
          <p>Try changing your search or filter selections.</p>
          <button className="secondary-button" type="button" onClick={clearFilters}>Clear filters</button>
        </section>
      ) : (
        <div className="task-list-page">
          {visibleTasks.map((task) => <TaskCard key={task.id} task={task} subject={task.subjectId ? subjectMap.get(task.subjectId) : undefined} project={task.projectId ? projects.find((project) => project.id === task.projectId) : undefined} onEdit={openEditForm} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />)}
        </div>
      )}

      {formOpen && <TaskForm key={editingTask?.id ?? 'new-task'} task={editingTask} projectId={requestedProjectId} subjects={subjects} projects={projects} saving={saving} onClose={() => setFormOpen(false)} onSubmit={handleSave} />}
      {deleteTarget && <DeleteTaskDialog task={deleteTarget} deleting={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />}
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  )
}
