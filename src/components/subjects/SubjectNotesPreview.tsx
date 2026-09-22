import { useEffect, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.ts'
import { subscribeToNotes } from '../../services/noteService.ts'
import type { Note } from '../../types/note.ts'
import { getFirebaseErrorMessage } from '../../utils/firebaseError.ts'

export function SubjectNotesPreview({ subjectId }: { subjectId: string }) {
  const { user } = useAuth(); const [notes, setNotes] = useState<Note[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { if (!user?.uid) return; return subscribeToNotes(user.uid, (next) => { setNotes(next.filter((note) => note.subjectId === subjectId).sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0)).slice(0, 3)); setLoading(false) }, (e) => { setError(getFirebaseErrorMessage(e, 'Notes could not be loaded right now.')); setLoading(false) }) }, [subjectId, user?.uid])
  return <article className="detail-notes-card"><div className="detail-task-card-heading"><span className="detail-task-icon"><FileText size={18} /></span><div><p className="panel-eyebrow">Subject notes</p><h2>Notes</h2></div></div>{loading ? <p className="detail-task-muted">Loading notes...</p> : error ? <p className="detail-task-muted">{error}</p> : notes.length === 0 ? <p className="detail-task-muted">No notes linked to this subject yet.</p> : <div className="subject-notes-preview-list">{notes.map((note) => <Link to={`/notes/${note.id}`} key={note.id}><strong>{note.title}</strong><small>{note.updatedAt?.toDate().toLocaleDateString() || 'Recently updated'}</small></Link>)}</div>}<div className="detail-notes-actions"><Link className="dashboard-panel-link" to={`/notes?subjectId=${encodeURIComponent(subjectId)}`}>View all notes</Link><Link className="dashboard-panel-link" to={`/notes?new=true&subjectId=${encodeURIComponent(subjectId)}`}><Plus size={13} /> Add note</Link></div></article>
}
