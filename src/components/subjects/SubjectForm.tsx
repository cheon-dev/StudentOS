import { useEffect, useState, type FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import type { Subject, SubjectFormData } from '../../types/subject.ts'
import { emptySubjectForm, isSubjectColor, isSubjectIcon, subjectColors, subjectDays, subjectIconLabels, subjectIcons } from '../../types/subject.ts'
import { SubjectIcon } from './SubjectIcon.tsx'

type SubjectFormProps = {
  subject?: Subject | null
  saving: boolean
  onClose: () => void
  onSubmit: (subject: SubjectFormData) => Promise<void>
}

function getFormData(subject?: Subject | null): SubjectFormData {
  if (!subject) {
    return emptySubjectForm()
  }

  return {
    name: subject.name,
    code: subject.code,
    instructor: subject.instructor,
    room: subject.room,
    color: isSubjectColor(subject.color) ? subject.color : 'purple',
    icon: isSubjectIcon(subject.icon) ? subject.icon : 'book',
    semester: subject.semester,
    schoolYear: subject.schoolYear,
    startDate: subject.startDate || '',
    endDate: subject.endDate || '',
    schedule: subject.schedule.map((entry) => ({ ...entry })),
  }
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function SubjectForm({ subject, saving, onClose, onSubmit }: SubjectFormProps) {
  const [formData, setFormData] = useState<SubjectFormData>(() => getFormData(subject))
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, saving])

  function updateField(field: keyof Omit<SubjectFormData, 'schedule'>, value: string) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  function updateSchedule(index: number, field: 'day' | 'startTime' | 'endTime', value: string) {
    setFormData((current) => ({
      ...current,
      schedule: current.schedule.map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: value } : entry),
    }))
  }

  function addSchedule() {
    setFormData((current) => ({
      ...current,
      schedule: [...current.schedule, { day: 'Monday', startTime: '', endTime: '' }],
    }))
  }

  function removeSchedule(index: number) {
    setFormData((current) => ({
      ...current,
      schedule: current.schedule.filter((_, entryIndex) => entryIndex !== index),
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError('')

    if (!formData.name.trim() || !formData.code.trim() || !formData.semester.trim() || !formData.schoolYear.trim()) {
      setValidationError('Complete the required fields before saving.')
      return
    }

    if ((formData.startDate && !formData.endDate) || (!formData.startDate && formData.endDate)) {
      setValidationError('Choose both a semester start date and end date.')
      return
    }

    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      setValidationError('The semester end date must be on or after the start date.')
      return
    }

    const hasInvalidSchedule = formData.schedule.some((entry) => (
      !entry.day || !entry.startTime || !entry.endTime || timeToMinutes(entry.endTime) <= timeToMinutes(entry.startTime)
    ))

    if (hasInvalidSchedule) {
      setValidationError('Check each schedule entry. Select a day and make sure the end time is after the start time.')
      return
    }

    await onSubmit({
      ...formData,
      name: formData.name.trim(),
      code: formData.code.trim(),
      instructor: formData.instructor.trim(),
      room: formData.room.trim(),
      semester: formData.semester.trim(),
      schoolYear: formData.schoolYear.trim(),
    })
  }

  return (
    <div className="modal-layer">
      <button className="modal-backdrop" type="button" aria-label="Close subject form" onClick={saving ? undefined : onClose} />
      <section className="subject-modal" role="dialog" aria-modal="true" aria-labelledby="subject-form-title">
        <div className="subject-modal-header">
          <div>
            <p className="dashboard-eyebrow">{subject ? 'Update your class' : 'Build your class list'}</p>
            <h2 id="subject-form-title">{subject ? 'Edit subject' : 'Add subject'}</h2>
          </div>
          <button className="modal-close-button" type="button" aria-label="Close subject form" onClick={onClose} disabled={saving}>
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        <form className="subject-form" onSubmit={handleSubmit} noValidate>
          {validationError && <div className="subject-form-error" role="alert">{validationError}</div>}
          <div className="subject-form-grid">
            <label>
              Subject name <span>*</span>
              <input type="text" value={formData.name} placeholder="Web Development" onChange={(event) => updateField('name', event.target.value)} disabled={saving} autoFocus required />
            </label>
            <label>
              Subject code <span>*</span>
              <input type="text" value={formData.code} placeholder="IT 401" onChange={(event) => updateField('code', event.target.value)} disabled={saving} required />
            </label>
            <label>
              Instructor
              <input type="text" value={formData.instructor} placeholder="Prof. Juan Dela Cruz" onChange={(event) => updateField('instructor', event.target.value)} disabled={saving} />
            </label>
            <label>
              Room
              <input type="text" value={formData.room} placeholder="Lab 2" onChange={(event) => updateField('room', event.target.value)} disabled={saving} />
            </label>
            <label>
              Semester <span>*</span>
              <select value={formData.semester} onChange={(event) => updateField('semester', event.target.value)} disabled={saving} required>
                <option value="">Select semester</option>
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer">Summer</option>
              </select>
            </label>
            <label>
              School year <span>*</span>
              <input type="text" value={formData.schoolYear} placeholder="2026-2027" onChange={(event) => updateField('schoolYear', event.target.value)} disabled={saving} required />
            </label>
            <label>
              Semester starts
              <input type="date" value={formData.startDate} max={formData.endDate || undefined} onChange={(event) => updateField('startDate', event.target.value)} disabled={saving} />
            </label>
            <label>
              Semester ends
              <input type="date" value={formData.endDate} min={formData.startDate || undefined} onChange={(event) => updateField('endDate', event.target.value)} disabled={saving} />
            </label>
          </div>

          <fieldset className="subject-choice-fieldset">
            <legend>Color</legend>
            <div className="subject-choice-row">
              {subjectColors.map((color) => (
                <button className={`color-choice color-choice--${color}${formData.color === color ? ' color-choice--selected' : ''}`} type="button" key={color} aria-label={`Choose ${color} color`} aria-pressed={formData.color === color} onClick={() => setFormData((current) => ({ ...current, color }))} disabled={saving} />
              ))}
            </div>
          </fieldset>

          <fieldset className="subject-choice-fieldset">
            <legend>Icon</legend>
            <div className="subject-icon-choice-row">
              {subjectIcons.map((icon) => (
                <button className={`icon-choice${formData.icon === icon ? ' icon-choice--selected' : ''}`} type="button" key={icon} aria-label={`Choose ${subjectIconLabels[icon]} icon`} title={subjectIconLabels[icon]} aria-pressed={formData.icon === icon} onClick={() => setFormData((current) => ({ ...current, icon }))} disabled={saving}>
                  <SubjectIcon icon={icon} color={formData.color} size={18} />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="schedule-fieldset">
            <div className="schedule-legend-row">
              <legend>Schedule</legend>
              <span>Optional</span>
            </div>
            {formData.schedule.map((entry, index) => (
              <div className="schedule-form-row" key={`${index}-${entry.day}`}>
                <label>
                  Day
                  <select value={entry.day} onChange={(event) => updateSchedule(index, 'day', event.target.value)} disabled={saving}>
                    {subjectDays.map((day) => <option value={day} key={day}>{day}</option>)}
                  </select>
                </label>
                <label>
                  Start time
                  <input type="time" value={entry.startTime} onChange={(event) => updateSchedule(index, 'startTime', event.target.value)} disabled={saving} />
                </label>
                <label>
                  End time
                  <input type="time" value={entry.endTime} onChange={(event) => updateSchedule(index, 'endTime', event.target.value)} disabled={saving} />
                </label>
                <button className="remove-schedule-button" type="button" aria-label={`Remove ${entry.day} schedule`} onClick={() => removeSchedule(index)} disabled={saving}>
                  <X size={16} strokeWidth={1.8} />
                </button>
              </div>
            ))}
            <button className="add-schedule-button" type="button" onClick={addSchedule} disabled={saving}>
              <Plus size={16} strokeWidth={1.8} />
              Add schedule
            </button>
          </fieldset>

          <div className="subject-form-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : subject ? 'Save changes' : 'Add subject'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
