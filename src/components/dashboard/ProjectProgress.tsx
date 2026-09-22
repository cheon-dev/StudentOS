import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Project } from '../../types/project.ts'
import type { Task } from '../../types/task.ts'

export function ProjectProgress({ projects, tasks }: { projects: Project[]; tasks: Task[] }) {
  const activeProjects = projects.filter((project) => project.status !== 'Completed').slice(0, 3)
  return (
    <section className="dashboard-panel">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Make it visible</p>
          <h2>Project Progress</h2>
        </div>
        <Link className="dashboard-panel-link" to="/projects">All projects <ArrowUpRight size={14} /></Link>
      </div>
      <div className="project-list">
        {activeProjects.length === 0 ? <p className="detail-task-muted">No active projects yet.</p> : activeProjects.map((project) => {
          const linkedTasks = tasks.filter((task) => task.projectId === project.id)
          const progress = linkedTasks.length ? Math.round(linkedTasks.filter((task) => task.status === 'Completed').length / linkedTasks.length * 100) : project.progress
          return <Link className="project-row" key={project.id} to={`/projects/${project.id}`}>
            <div className="project-row-heading">
              <strong>{project.name}</strong>
              <span>{progress}%</span>
            </div>
            <div className="progress-track">
              <span className="progress-value progress-value--purple" style={{ width: `${progress}%` }} />
            </div>
          </Link>
        })}
      </div>
    </section>
  )
}
