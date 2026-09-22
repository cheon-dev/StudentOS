import { ArrowUpRight, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Subject } from '../../types/subject.ts'
import type { Task } from '../../types/task.ts'
import { formatTaskDate } from '../../utils/task.ts'

type UpcomingDeadlinesProps = {
  tasks: Task[]
  subjects: Subject[]
  loading: boolean
}

export function UpcomingDeadlines({ tasks, subjects, loading }: UpcomingDeadlinesProps) {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]))

  return (
    <section className="dashboard-panel">
      <div className="panel-heading">
        <div><p className="panel-eyebrow">Keep an eye out</p><h2>Upcoming Deadlines</h2></div>
        <CalendarDays className="panel-heading-arrow" size={18} strokeWidth={1.8} />
      </div>
      {loading ? <div className="dashboard-task-loading">Loading deadlines...</div> : tasks.length === 0 ? <div className="dashboard-task-empty">No upcoming deadlines.</div> : <div className="deadline-list">
        {tasks.map((task) => {
          const subject = task.subjectId ? subjectMap.get(task.subjectId) : undefined

          return (
            <Link className="deadline-row" key={task.id} to={`/tasks/${task.id}`}>
              <span className="deadline-date deadline-date--purple">{formatTaskDate(task.dueDate)}</span>
              <span className="deadline-details"><small>{task.type} · {subject?.name || (task.subjectId ? 'Deleted Subject' : 'General')}</small><strong>{task.title}</strong></span>
              <ArrowUpRight size={15} strokeWidth={1.8} />
            </Link>
          )
        })}
      </div>}
      <Link className="dashboard-panel-link" to="/tasks?view=upcoming">View deadlines</Link>
    </section>
  )
}
