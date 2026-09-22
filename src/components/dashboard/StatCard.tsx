import type { DashboardStat } from '../../data/dashboard.ts'

type StatCardProps = {
  stat: DashboardStat
}

export function StatCard({ stat }: StatCardProps) {
  const Icon = stat.icon

  return (
    <article className={`stat-card stat-card--${stat.tone}`}>
      <div className="stat-card-topline">
        <span className="stat-card-icon"><Icon size={18} strokeWidth={1.8} /></span>
        {stat.demo && <span className="demo-badge">Demo</span>}
      </div>
      <p className="stat-card-label">{stat.label}</p>
      <div className="stat-card-value-row">
        <strong>{stat.value}</strong>
        <span>{stat.detail}</span>
      </div>
    </article>
  )
}
