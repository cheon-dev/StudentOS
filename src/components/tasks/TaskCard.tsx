import { CalendarClock, Check, Clock3, Eye, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Subject } from '../../types/subject.ts'
import type { Project } from '../../types/project.ts'
import type { Task } from '../../types/task.ts'
import { formatTaskDateTime, isTaskOverdue } from '../../utils/task.ts'
import { TaskPriorityBadge } from './TaskPriorityBadge.tsx'
import { TaskStatusBadge } from './TaskStatusBadge.tsx'

type TaskCardProps = {
  task: Task
  subject?: Subject
  project?: Project
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onStatusChange: (task: Task) => void
}

export function TaskCard({ task, subject, project, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const overdue = isTaskOverdue(task)
  const subjectLabel = subject ? `${subject.name} (${subject.code})` : task.subjectId ? 'Deleted Subject' : 'General'

  return (
    <article className={`task-card${overdue ? ' task-card--overdue' : ''}${task.status === 'Completed' ? ' task-card--completed' : ''}`}>
      <div className="task-card-check-column">
        <button className={`task-complete-button${task.status === 'Completed' ? ' task-complete-button--checked' : ''}`} type="button" aria-label={task.status === 'Completed' ? `Reopen ${task.title}` : `Mark ${task.title} complete`} onClick={() => onStatusChange(task)}>
          <Check size={16} strokeWidth={2.1} />
        </button>
      </div>
      <Link className="task-card-main" to={`/tasks/${task.id}`}>
        <div className="task-card-title-row">
          <h2>{task.title}</h2>
          <span className="task-type-label">{task.type}</span>
        </div>
        {task.description && <p className="task-card-description">{task.description}</p>}
        <div className="task-card-meta-row">
          <span className={`task-subject-label${task.subjectId && !subject ? ' task-subject-label--deleted' : ''}`}>{subjectLabel}</span>
          {task.projectId && <span className={!project ? 'task-subject-label--deleted' : ''}>{project?.name || 'Deleted Project'}</span>}
          <span><CalendarClock size={14} strokeWidth={1.8} />{formatTaskDateTime(task.dueDate)}</span>
          {task.estimatedMinutes !== null && <span><Clock3 size={14} strokeWidth={1.8} />{task.estimatedMinutes} min</span>}
        </div>
      </Link>
      <div className="task-card-labels">
        {overdue && <span className="overdue-label">Overdue</span>}
        <TaskPriorityBadge priority={task.priority} />
        <TaskStatusBadge status={task.status} />
      </div>
      <div className="task-card-actions">
        <Link className="task-action-button" to={`/tasks/${task.id}`} aria-label={`View ${task.title}`}>
          <Eye size={14} strokeWidth={1.8} />
          View
        </Link>
        <button className="task-action-button" type="button" onClick={() => onEdit(task)}>
          <Pencil size={14} strokeWidth={1.8} />
          Edit
        </button>
        <button className="task-action-button task-action-button--delete" type="button" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task)}>
          <Trash2 size={14} strokeWidth={1.8} />
          <span className="task-delete-label">Delete</span>
        </button>
      </div>
    </article>
  )
}
