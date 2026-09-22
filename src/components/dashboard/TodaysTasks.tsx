import { CheckCircle2, Circle, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Subject } from '../../types/subject.ts'
import type { Task } from '../../types/task.ts'
import { formatTaskDateTime } from '../../utils/task.ts'
import { TaskPriorityBadge } from '../tasks/TaskPriorityBadge.tsx'

type TodaysTasksProps = {
  tasks: Task[]
  subjects: Subject[]
  loading: boolean
  error: string
  onStatusChange: (task: Task) => void
}

export function TodaysTasks({ tasks, subjects, loading, error, onStatusChange }: TodaysTasksProps) {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]))

  return (
    <section className="dashboard-panel dashboard-panel--tasks">
      <div className="panel-heading">
        <div><p className="panel-eyebrow">Focus for today</p><h2>Today&apos;s Tasks</h2></div>
        <button className="panel-more-button" type="button" aria-label="More task options"><MoreHorizontal size={19} strokeWidth={1.8} /></button>
      </div>
      {loading ? <div className="dashboard-task-loading">Loading today&apos;s tasks...</div> : error ? <div className="dashboard-task-empty">{error}</div> : tasks.length === 0 ? (
        <div className="dashboard-task-empty"><p>No tasks due today.</p><Link to="/tasks?new=true">Add a task for today</Link></div>
      ) : <div className="task-list">
        {tasks.map((task) => {
          const subject = task.subjectId ? subjectMap.get(task.subjectId) : undefined

          return (
            <div className={`task-row${task.status === 'Completed' ? ' task-row--completed' : ''}`} key={task.id}>
              <button className="dashboard-task-check" type="button" aria-label={task.status === 'Completed' ? `Reopen ${task.title}` : `Mark ${task.title} complete`} onClick={() => onStatusChange(task)}>
                {task.status === 'Completed' ? <CheckCircle2 size={19} strokeWidth={1.8} /> : <Circle size={19} strokeWidth={1.8} />}
              </button>
              <span className="task-details">
                <strong>{task.title}</strong>
                <span>{subject ? subject.name : task.subjectId ? 'Deleted Subject' : 'General'} · {formatTaskDateTime(task.dueDate)}</span>
              </span>
              <TaskPriorityBadge priority={task.priority} />
            </div>
          )
        })}
      </div>}
      <Link className="dashboard-panel-link" to="/tasks">View all tasks</Link>
    </section>
  )
}
