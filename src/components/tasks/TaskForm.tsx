import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Subject } from '../../types/subject.ts'
import type { Project } from '../../types/project.ts'
import { emptyTaskForm, taskPriorities, taskStatuses, taskTypes, type Task, type TaskFormData, type TaskPriority, type TaskStatus, type TaskType } from '../../types/task.ts'
import { getTaskFormData, localDateTimeToTimestamp } from '../../utils/task.ts'

type TaskFormProps = {
  task?: Task | null
  subjects: Subject[]
  projects?: Project[]
  projectId?: string | null
  saving: boolean
  onClose: () => void
  onSubmit: (task: TaskFormData) => Promise<void>
}

function getInitialForm(task?: Task | null, projectId?: string | null) {
  return task ? getTaskFormData(task) : { ...emptyTaskForm(), projectId: projectId ?? null }
}

export function TaskForm({ task, subjects, projects = [], projectId, saving, onClose, onSubmit }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>(() => getInitialForm(task, projectId))
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

  function updateField(field: keyof TaskFormData, value: string | number | boolean | null) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError('')

    if (!formData.title.trim()) {
      setValidationError('Add a title before saving this task.')
      return
    }

    if (!formData.type || !formData.priority) {
      setValidationError('Choose a task type and priority before saving.')
      return
    }

    if (formData.estimatedMinutes !== null && (!Number.isFinite(formData.estimatedMinutes) || formData.estimatedMinutes < 0)) {
      setValidationError('Estimated minutes must be zero or greater.')
      return
    }

    if (formData.reminderEnabled && (!formData.reminderDate || !formData.reminderTime)) {
      setValidationError('Add both a reminder date and time, or turn the reminder off.')
      return
    }

    const dueTimestamp = localDateTimeToTimestamp(formData.dueDate, formData.dueTime)
    const reminderTimestamp = formData.reminderEnabled
      ? localDateTimeToTimestamp(formData.reminderDate, formData.reminderTime)
      : null

    if (dueTimestamp && reminderTimestamp && reminderTimestamp.toMillis() >= dueTimestamp.toMillis()) {
      setValidationError('The reminder should be earlier than the due date and time.')
      return
    }

    await onSubmit({
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
    })
  }

  return (
    <div className="modal-layer">
      <button className="modal-backdrop" type="button" aria-label="Close task form" onClick={saving ? undefined : onClose} />
      <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
        <div className="subject-modal-header">
          <div>
            <p className="dashboard-eyebrow">{task ? 'Update your plan' : 'Make it actionable'}</p>
            <h2 id="task-form-title">{task ? 'Edit task' : 'Add task'}</h2>
          </div>
          <button className="modal-close-button" type="button" aria-label="Close task form" onClick={onClose} disabled={saving}>
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        <form className="task-form" onSubmit={handleSubmit} noValidate>
          {validationError && <div className="subject-form-error" role="alert">{validationError}</div>}
          <label>
            Title <span>*</span>
            <input type="text" value={formData.title} placeholder="Finish routing documentation" onChange={(event) => updateField('title', event.target.value)} disabled={saving} autoFocus required />
          </label>
          <label>
            Description
            <textarea value={formData.description} placeholder="Add context or a few next steps..." onChange={(event) => updateField('description', event.target.value)} disabled={saving} rows={3} />
          </label>
          <div className="task-form-grid">
            <label>
              Subject
              <select value={formData.subjectId ?? ''} onChange={(event) => updateField('subjectId', event.target.value || null)} disabled={saving}>
                <option value="">General task</option>
                {subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name} ({subject.code})</option>)}
              </select>
            </label>
            <label>
              Task type <span>*</span>
              <select value={formData.type} onChange={(event) => updateField('type', event.target.value as TaskType)} disabled={saving} required>
                {taskTypes.map((type) => <option value={type} key={type}>{type}</option>)}
              </select>
            </label>
            <label>
              Project
              <select value={formData.projectId ?? ''} onChange={(event) => updateField('projectId', event.target.value || null)} disabled={saving}>
                <option value="">No project</option>
                {projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label>
              Priority <span>*</span>
              <select value={formData.priority} onChange={(event) => updateField('priority', event.target.value as TaskPriority)} disabled={saving} required>
                {taskPriorities.map((priority) => <option value={priority} key={priority}>{priority}</option>)}
              </select>
            </label>
            <label>
              Status
              <select value={formData.status} onChange={(event) => updateField('status', event.target.value as TaskStatus)} disabled={saving}>
                {taskStatuses.map((status) => <option value={status} key={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <div className="task-form-grid task-form-grid--dates">
            <label>
              Due date
              <input type="date" value={formData.dueDate} onChange={(event) => updateField('dueDate', event.target.value)} disabled={saving} />
            </label>
            <label>
              Due time
              <input type="time" value={formData.dueTime} onChange={(event) => updateField('dueTime', event.target.value)} disabled={saving} />
            </label>
            <label>
              Estimated minutes
              <input type="number" min="0" step="5" value={formData.estimatedMinutes ?? ''} placeholder="e.g. 45" onChange={(event) => updateField('estimatedMinutes', event.target.value === '' ? null : Number(event.target.value))} disabled={saving} />
            </label>
          </div>
          <fieldset className="reminder-fieldset">
            <label className="reminder-toggle-row">
              <input type="checkbox" checked={formData.reminderEnabled} onChange={(event) => updateField('reminderEnabled', event.target.checked)} disabled={saving} />
              <span className="custom-checkbox" aria-hidden="true" />
              <span><strong>Set a reminder</strong><small>Send a phone notification before the deadline.</small></span>
            </label>
            {formData.reminderEnabled && (
              <div className="task-form-grid reminder-fields">
                <label>
                  Reminder date
                  <input type="date" value={formData.reminderDate} onChange={(event) => updateField('reminderDate', event.target.value)} disabled={saving} />
                </label>
                <label>
                  Reminder time
                  <input type="time" value={formData.reminderTime} onChange={(event) => updateField('reminderTime', event.target.value)} disabled={saving} />
                </label>
              </div>
            )}
          </fieldset>
          <div className="subject-form-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : task ? 'Save changes' : 'Add task'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
