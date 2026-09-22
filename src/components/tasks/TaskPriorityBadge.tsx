import type { TaskPriority } from '../../types/task.ts'

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`task-priority-badge task-priority-badge--${priority.toLowerCase()}`}>{priority}</span>
}
