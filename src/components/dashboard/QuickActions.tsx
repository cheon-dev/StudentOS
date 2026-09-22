import { ArrowUpRight, BookOpen, Brain, Bot, FilePlus2, FolderPlus, ListPlus, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

const actions = [
  { label: 'Task', path: '/tasks?new=true', icon: ListPlus, tone: 'purple' },
  { label: 'Note', path: '/notes', icon: FilePlus2, tone: 'blue' },
  { label: 'Expense', path: '/expenses?new=true', icon: Plus, tone: 'orange' },
  { label: 'Project', path: '/projects', icon: FolderPlus, tone: 'green' },
  { label: 'Reviewer', path: '/reviewer?new=true', icon: Brain, tone: 'purple' },
  { label: 'Assistant', path: '/assistant', icon: Bot, tone: 'blue' },
]

export function QuickActions() {
  return (
    <section className="dashboard-panel quick-actions-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Jump right in</p>
          <h2>Quick Actions</h2>
        </div>
      </div>
      <div className="quick-actions-grid">
        {actions.map((action) => {
          const Icon = action.icon

          return (
            <Link className="quick-action" key={action.label} to={action.path}>
              <span className={`quick-action-icon quick-action-icon--${action.tone}`}><Icon size={17} strokeWidth={1.8} /></span>
              <span>+ {action.label}</span>
              <ArrowUpRight className="quick-action-arrow" size={15} strokeWidth={1.8} />
            </Link>
          )
        })}
      </div>
      <Link className="study-session-link" to="/study">
        <BookOpen size={17} strokeWidth={1.8} />
        Start Study Session
        <ArrowUpRight size={15} strokeWidth={1.8} />
      </Link>
    </section>
  )
}
