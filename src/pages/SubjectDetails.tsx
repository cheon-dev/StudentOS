import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, CalendarDays, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DeleteSubjectDialog } from '../components/subjects/DeleteSubjectDialog.tsx'
import { SubjectForm } from '../components/subjects/SubjectForm.tsx'
import { SubjectIcon } from '../components/subjects/SubjectIcon.tsx'
import { SubjectTasksPreview } from '../components/subjects/SubjectTasksPreview.tsx'
import { SubjectNotesPreview } from '../components/subjects/SubjectNotesPreview.tsx'
import { SubjectReviewersPreview } from '../components/subjects/SubjectReviewersPreview.tsx'
import { Toast } from '../components/subjects/Toast.tsx'
import { useAuth } from '../context/useAuth.ts'
import { deleteSubject, subscribeToSubject, updateSubject } from '../services/subjectService.ts'
import type { Subject, SubjectFormData } from '../types/subject.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'
import { formatSubjectTime } from '../utils/subject.ts'

export function SubjectDetails() {
  const { user } = useAuth()
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!user?.uid || !subjectId || subjectId.includes('/')) {
      return
    }

    return subscribeToSubject(
      user.uid,
      subjectId,
      (nextSubject) => {
        setSubject(nextSubject)
        setLoading(false)
      },
      () => {
        setSubject(null)
        setLoading(false)
        setError('This subject could not be found or may have been removed.')
      },
      (firestoreError) => {
        setLoading(false)
        setError(getFirebaseErrorMessage(firestoreError, 'We could not load this subject. Please try again.'))
      },
    )
  }, [subjectId, user?.uid])

  async function handleSave(subjectData: SubjectFormData) {
    if (!user?.uid || !subject) {
      return
    }

    setSaving(true)

    try {
      await updateSubject(user.uid, subject.id, subjectData)
      setFormOpen(false)
      setToast({ message: `${subjectData.name} was updated.`, tone: 'success' })
    } catch (saveError) {
      setToast({ message: getFirebaseErrorMessage(saveError, 'We could not update that subject.'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!user?.uid || !subject) {
      return
    }

    setDeleting(true)

    try {
      await deleteSubject(user.uid, subject.id)
      navigate('/subjects', { replace: true })
    } catch (deleteError) {
      setToast({ message: getFirebaseErrorMessage(deleteError, 'We could not delete that subject.'), tone: 'error' })
      setDeleting(false)
    }
  }

  if (!subjectId || subjectId.includes('/')) {
    return (
      <section className="subjects-feedback subjects-feedback--error subject-detail-error" role="alert">
        <BookOpen size={25} strokeWidth={1.7} />
        <h2>Subject unavailable</h2>
        <p>This subject link is invalid.</p>
        <Link className="secondary-button" to="/subjects"><ArrowLeft size={15} strokeWidth={1.8} /> Back to subjects</Link>
      </section>
    )
  }

  if (loading) {
    return <div className="subject-details-loading"><div className="detail-skeleton" /><div className="detail-skeleton detail-skeleton--wide" /></div>
  }

  if (error || !subject) {
    return (
      <section className="subjects-feedback subjects-feedback--error subject-detail-error" role="alert">
        <BookOpen size={25} strokeWidth={1.7} />
        <h2>Subject unavailable</h2>
        <p>{error || 'This subject could not be found.'}</p>
        <Link className="secondary-button" to="/subjects"><ArrowLeft size={15} strokeWidth={1.8} /> Back to subjects</Link>
      </section>
    )
  }

  return (
    <div className="subject-details-page">
      <Link className="back-to-subjects" to="/subjects"><ArrowLeft size={16} strokeWidth={1.8} /> All subjects</Link>
      <section className="subject-details-hero">
        <div className="subject-details-heading">
          <SubjectIcon icon={subject.icon} color={subject.color} size={28} />
          <div>
            <p className="dashboard-eyebrow">Subject overview</p>
            <h1>{subject.name}</h1>
            <p className="subject-details-code">{subject.code}</p>
          </div>
        </div>
        <div className="subject-details-actions">
          <button className="secondary-button" type="button" onClick={() => setFormOpen(true)}><Pencil size={15} strokeWidth={1.8} /> Edit</button>
          <button className="danger-outline-button" type="button" onClick={() => setDeleteOpen(true)}><Trash2 size={15} strokeWidth={1.8} /> Delete</button>
        </div>
      </section>

      <section className="subject-details-info">
        <div><span>Instructor</span><strong>{subject.instructor || 'Not set'}</strong></div>
        <div><span>Room</span><strong>{subject.room || 'Not set'}</strong></div>
        <div><span>Semester</span><strong>{subject.semester}</strong></div>
        <div><span>School year</span><strong>{subject.schoolYear}</strong></div>
      </section>

      <section className="subject-details-content">
        <div className="dashboard-panel detail-schedule-panel">
          <div className="panel-heading">
            <div><p className="panel-eyebrow">When you meet</p><h2>Schedule</h2></div>
            <CalendarDays size={19} strokeWidth={1.8} className="panel-heading-arrow" />
          </div>
          {subject.schedule.length > 0 ? (
            <div className="detail-schedule-list">
              {subject.schedule.map((schedule) => (
                <div className="detail-schedule-row" key={`${schedule.day}-${schedule.startTime}`}>
                  <strong>{schedule.day}</strong>
                  <span>{formatSubjectTime(schedule.startTime)} - {formatSubjectTime(schedule.endTime)}</span>
                </div>
              ))}
            </div>
          ) : <p className="detail-empty-copy">No schedule entries have been added yet.</p>}
        </div>
        <div className="details-placeholder-grid">
          <SubjectTasksPreview subjectId={subject.id} />
          <SubjectNotesPreview subjectId={subject.id} />
          <DetailPlaceholder icon={FolderOpen} title="Files" />
           <SubjectReviewersPreview subjectId={subject.id} />
        </div>
      </section>

      {formOpen && <SubjectForm subject={subject} saving={saving} onClose={() => setFormOpen(false)} onSubmit={handleSave} />}
      {deleteOpen && <DeleteSubjectDialog subject={subject} deleting={deleting} onCancel={() => setDeleteOpen(false)} onConfirm={handleDelete} />}
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  )
}

function DetailPlaceholder({ icon: Icon, title }: { icon: typeof BookOpen; title: string }) {
  return (
    <article className="detail-placeholder-card">
      <span><Icon size={18} strokeWidth={1.8} /></span>
      <div><h2>{title}</h2><p>Coming in a future phase.</p></div>
    </article>
  )
}
