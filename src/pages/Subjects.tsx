import { useEffect, useState } from 'react'
import { BookOpen, Plus, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { DeleteSubjectDialog } from '../components/subjects/DeleteSubjectDialog.tsx'
import { SubjectCard } from '../components/subjects/SubjectCard.tsx'
import { SubjectForm } from '../components/subjects/SubjectForm.tsx'
import { Toast } from '../components/subjects/Toast.tsx'
import { useAuth } from '../context/useAuth.ts'
import { createSubject, deleteSubject, subscribeToSubjects, updateSubject } from '../services/subjectService.ts'
import type { Subject, SubjectFormData } from '../types/subject.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'

export function Subjects() {
  const { user } = useAuth()
  const userId = user?.uid
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('all')
  const [schoolYearFilter, setSchoolYearFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!userId) {
      return
    }

    return subscribeToSubjects(
      userId,
      (nextSubjects) => {
        setSubjects(nextSubjects)
        setLoading(false)
      },
      (error) => {
        setLoadError(getFirebaseErrorMessage(error, 'We could not load your subjects. Please try again.'))
        setLoading(false)
      },
    )
  }, [userId])

  const semesters = [...new Set(subjects.map((subject) => subject.semester).filter(Boolean))]
  const schoolYears = [...new Set(subjects.map((subject) => subject.schoolYear).filter(Boolean))]
  const normalizedSearch = search.trim().toLowerCase()
  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch = !normalizedSearch || [subject.name, subject.code, subject.instructor]
      .some((value) => value.toLowerCase().includes(normalizedSearch))
    const matchesSemester = semesterFilter === 'all' || subject.semester === semesterFilter
    const matchesSchoolYear = schoolYearFilter === 'all' || subject.schoolYear === schoolYearFilter

    return matchesSearch && matchesSemester && matchesSchoolYear
  })
  const filtersActive = Boolean(normalizedSearch) || semesterFilter !== 'all' || schoolYearFilter !== 'all'

  function openCreateForm() {
    setEditingSubject(null)
    setFormOpen(true)
  }

  function openEditForm(subject: Subject) {
    setEditingSubject(subject)
    setFormOpen(true)
  }

  async function handleSave(subjectData: SubjectFormData) {
    if (!userId) {
      return
    }

    setSaving(true)

    try {
      if (editingSubject) {
        await updateSubject(userId, editingSubject.id, subjectData)
        setToast({ message: `${subjectData.name} was updated.`, tone: 'success' })
      } else {
        await createSubject(userId, subjectData)
        setToast({ message: `${subjectData.name} was added to your subjects.`, tone: 'success' })
      }
      setFormOpen(false)
      setEditingSubject(null)
    } catch (saveError) {
      setToast({
        message: getFirebaseErrorMessage(saveError, `We could not ${editingSubject ? 'update' : 'create'} that subject.`),
        tone: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!userId || !deleteTarget) {
      return
    }

    setDeleting(true)

    try {
      await deleteSubject(userId, deleteTarget.id)
      setToast({ message: `${deleteTarget.name} was deleted.`, tone: 'success' })
      setDeleteTarget(null)
    } catch (deleteError) {
      setToast({ message: getFirebaseErrorMessage(deleteError, 'We could not delete that subject.'), tone: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  function clearFilters() {
    setSearch('')
    setSemesterFilter('all')
    setSchoolYearFilter('all')
  }

  return (
    <div className="subjects-page">
      <section className="module-page-header">
        <div>
          <p className="dashboard-eyebrow">Academic foundation</p>
          <h1>Subjects</h1>
          <p>Manage your classes and academic subjects.</p>
        </div>
        <button className="primary-button" type="button" onClick={openCreateForm}>
          <Plus size={17} strokeWidth={1.9} />
          Add subject
        </button>
      </section>

      <section className="subjects-toolbar" aria-label="Subject filters">
        <label className="subjects-search">
          <Search size={17} strokeWidth={1.8} aria-hidden="true" />
          <input type="search" value={search} placeholder="Search subjects, codes, or instructors" aria-label="Search subjects" onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="subject-filter-group">
          <SlidersHorizontal size={15} strokeWidth={1.8} aria-hidden="true" />
          <select value={semesterFilter} aria-label="Filter by semester" onChange={(event) => setSemesterFilter(event.target.value)}>
            <option value="all">All semesters</option>
            {semesters.map((semester) => <option value={semester} key={semester}>{semester}</option>)}
          </select>
          <select value={schoolYearFilter} aria-label="Filter by school year" onChange={(event) => setSchoolYearFilter(event.target.value)}>
            <option value="all">All school years</option>
            {schoolYears.map((schoolYear) => <option value={schoolYear} key={schoolYear}>{schoolYear}</option>)}
          </select>
        </div>
        <div className="subject-toolbar-count">
          <strong>{filteredSubjects.length}</strong>
          <span>{filteredSubjects.length === 1 ? 'subject' : 'subjects'}</span>
        </div>
        {filtersActive && (
          <button className="clear-filters-button" type="button" onClick={clearFilters}>
            <RotateCcw size={14} strokeWidth={1.8} />
            Clear
          </button>
        )}
      </section>

      {loadError ? (
        <section className="subjects-feedback subjects-feedback--error" role="alert">
          <BookOpen size={24} strokeWidth={1.7} />
          <h2>Subjects are unavailable</h2>
          <p>{loadError}</p>
        </section>
      ) : loading ? (
        <div className="subject-grid" aria-label="Loading subjects">
          {Array.from({ length: 6 }, (_, index) => <div className="subject-card subject-card--skeleton" key={index} />)}
        </div>
      ) : subjects.length === 0 ? (
        <section className="subjects-feedback">
          <div className="empty-subject-icon"><BookOpen size={27} strokeWidth={1.7} /></div>
          <p className="dashboard-eyebrow">Your academic home base</p>
          <h2>No subjects yet</h2>
          <p>Add your subjects to organize your tasks, notes, schedules, and reviewers.</p>
          <button className="primary-button" type="button" onClick={openCreateForm}>
            <Plus size={17} strokeWidth={1.9} />
            Add subject
          </button>
        </section>
      ) : filteredSubjects.length === 0 ? (
        <section className="subjects-feedback">
          <div className="empty-subject-icon"><Search size={25} strokeWidth={1.7} /></div>
          <h2>No matching subjects</h2>
          <p>Try a different search or clear your filters.</p>
          <button className="secondary-button" type="button" onClick={clearFilters}>Clear filters</button>
        </section>
      ) : (
        <div className="subject-grid">
          {filteredSubjects.map((subject) => (
            <SubjectCard subject={subject} key={subject.id} onEdit={openEditForm} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {formOpen && (
        <SubjectForm key={editingSubject?.id ?? 'new-subject'} subject={editingSubject} saving={saving} onClose={() => setFormOpen(false)} onSubmit={handleSave} />
      )}
      {deleteTarget && (
        <DeleteSubjectDialog subject={deleteTarget} deleting={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  )
}
