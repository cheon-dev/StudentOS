import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Construction } from 'lucide-react'
import { Link } from 'react-router-dom'

type PlaceholderPageProps = {
  title: string
  description?: string
  icon?: LucideIcon
}

export function PlaceholderPage({ title, description, icon: PageIcon = Construction }: PlaceholderPageProps) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-icon"><PageIcon size={28} strokeWidth={1.6} /></div>
      <p className="dashboard-eyebrow">Coming in a future phase</p>
      <h1>{title}</h1>
      <p>{description || 'This module will be implemented in a future phase.'}</p>
      <Link className="placeholder-back-link" to="/dashboard">
        <ArrowLeft size={16} strokeWidth={1.8} />
        Back to dashboard
      </Link>
    </section>
  )
}
