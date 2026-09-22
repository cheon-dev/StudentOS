import { FileText, Pin, PinOff, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Note } from '../../types/note.ts'
import type { Subject } from '../../types/subject.ts'

type NoteCardProps = { note: Note; subject?: Subject; onEdit: (note: Note) => void; onDelete: (note: Note) => void; onTogglePin: (note: Note) => void }
export function NoteCard({ note, subject, onEdit, onDelete, onTogglePin }: NoteCardProps) {
  const preview = note.content.replace(/\s+/g, ' ').trim() || 'No content yet.'
  return <article className={`note-card${note.isPinned ? ' note-card--pinned' : ''}`}><Link className="note-card-main" to={`/notes/${note.id}`}><div className="note-card-heading"><span className="note-card-icon"><FileText size={19} /></span>{note.isPinned && <Pin size={15} className="note-pin" fill="currentColor" />}</div><h2>{note.title}</h2><p>{preview}</p><span className="note-card-subject">{subject ? subject.name : note.subjectId ? 'Deleted Subject' : 'General note'}</span><div className="note-tags">{note.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div></Link><div className="note-card-footer"><span>{note.updatedAt?.toDate().toLocaleDateString() || 'Recently updated'}</span><div><button type="button" aria-label={note.isPinned ? `Unpin ${note.title}` : `Pin ${note.title}`} onClick={() => onTogglePin(note)}>{note.isPinned ? <PinOff size={14} /> : <Pin size={14} />}</button><button type="button" aria-label={`Edit ${note.title}`} onClick={() => onEdit(note)}><Pencil size={14} /></button><button className="task-action-button--delete" type="button" aria-label={`Delete ${note.title}`} onClick={() => onDelete(note)}><Trash2 size={14} /></button></div></div></article>
}
