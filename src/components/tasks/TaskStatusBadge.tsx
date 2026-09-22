import type { TaskStatus } from '../../types/task.ts'

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`task-status-badge task-status-badge--${status.toLowerCase().replace(' ', '-')}`}>{status}</span>
}
