import { Clock3, MapPin, Pencil, Trash2, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Subject } from '../../types/subject.ts'
import { formatSubjectTime } from '../../utils/subject.ts'
import { SubjectIcon } from './SubjectIcon.tsx'

type SubjectCardProps = {
  subject: Subject
  onEdit: (subject: Subject) => void
  onDelete: (subject: Subject) => void
}

export function SubjectCard({ subject, onEdit, onDelete }: SubjectCardProps) {
  return (
    <article className="subject-card">
      <Link className="subject-card-main" to={`/subjects/${subject.id}`}>
        <div className="subject-card-heading">
          <SubjectIcon icon={subject.icon} color={subject.color} />
          <span className="subject-card-chevron" aria-hidden="true">↗</span>
        </div>
        <div className="subject-card-title">
          <h2>{subject.name}</h2>
          <span>{subject.code}</span>
        </div>
        <div className="subject-card-meta">
          <p><UserRound size={14} strokeWidth={1.8} /><span>{subject.instructor || 'Instructor not set'}</span></p>
          <p><MapPin size={14} strokeWidth={1.8} /><span>{subject.room || 'Room not set'}</span></p>
        </div>
        <div className="subject-card-schedule">
          <span className="subject-meta-label"><Clock3 size={13} strokeWidth={1.8} /> Schedule</span>
          {subject.schedule.length > 0 ? subject.schedule.map((schedule) => (
            <p key={`${schedule.day}-${schedule.startTime}`}>
              <strong>{schedule.day}</strong>
              <span>{formatSubjectTime(schedule.startTime)} - {formatSubjectTime(schedule.endTime)}</span>
            </p>
          )) : <p className="subject-no-schedule">No schedule added</p>}
        </div>
      </Link>
      <div className="subject-card-footer">
        <span>{subject.semester} <b aria-hidden="true">•</b> {subject.schoolYear}</span>
        <div className="subject-card-actions">
          <button type="button" aria-label={`Edit ${subject.name}`} onClick={() => onEdit(subject)}>
            <Pencil size={14} strokeWidth={1.8} />
            Edit
          </button>
          <button className="subject-delete-action" type="button" aria-label={`Delete ${subject.name}`} onClick={() => onDelete(subject)}>
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </article>
  )
}
