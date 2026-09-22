import { ArrowLeft, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-card" role="alert">
        <span className="not-found-icon"><SearchX size={25} /></span>
        <p className="dashboard-eyebrow">StudentOS</p>
        <h1>Page not found</h1>
        <p>The page you requested does not exist or may have moved.</p>
        <Link className="primary-button" to="/dashboard"><ArrowLeft size={15} /> Back to dashboard</Link>
      </section>
    </main>
  )
}
