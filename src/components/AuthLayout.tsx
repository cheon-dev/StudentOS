import type { ReactNode } from 'react'

type AuthLayoutProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <aside className="brand-panel">
        <div>
          <div className="brand-lockup">
            <span className="brand-mark">S</span>
            <span className="brand-name">StudentOS</span>
          </div>
           <div className="brand-copy">
             <p className="panel-kicker">Your semester, in sync.</p>
             <h2>A calmer way to keep up with student life.</h2>
            <p>
              Bring your tasks, notes, projects, and plans into one focused
              workspace.
             </p>
           </div>
           <div className="auth-panel-preview" aria-hidden="true">
             <div className="auth-panel-preview-heading"><span>Today at a glance</span><strong>StudentOS</strong></div>
             <div className="auth-panel-preview-row"><span className="auth-panel-preview-dot auth-panel-preview-dot--green" /><span>Deep work session</span><strong>25 min</strong></div>
             <div className="auth-panel-preview-row"><span className="auth-panel-preview-dot auth-panel-preview-dot--peach" /><span>Review tomorrow's tasks</span><strong>3 left</strong></div>
           </div>
         </div>
        <div className="panel-note">
          <span className="sparkle" aria-hidden="true">✦</span>
          <span>Built for your next big thing.</span>
        </div>
      </aside>
      <section className="auth-main">
        <div className="auth-card">
          <div className="auth-heading">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
      </section>
    </main>
  )
}
