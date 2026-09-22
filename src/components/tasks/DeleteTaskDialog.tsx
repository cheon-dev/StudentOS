import { AlertTriangle, X } from 'lucide-react'
import type { Task } from '../../types/task.ts'

type DeleteTaskDialogProps = {
  task: Task
  itemLabel?: string
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteTaskDialog({ task, itemLabel = 'task', deleting, onCancel, onConfirm }: DeleteTaskDialogProps) {
  return (
    <div className="modal-layer">
      <button className="modal-backdrop" type="button" aria-label="Close delete confirmation" onClick={onCancel} />
      <section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-task-title">
        <button className="modal-close-button" type="button" aria-label="Close dialog" onClick={onCancel}>
          <X size={18} strokeWidth={1.8} />
        </button>
        <div className="delete-dialog-icon"><AlertTriangle size={23} strokeWidth={1.8} /></div>
        <p className="dashboard-eyebrow">Remove {itemLabel}</p>
        <h2 id="delete-task-title">Delete {itemLabel}?</h2>
        <p><strong>{task.title}</strong> will be permanently removed.</p>
        <div className="delete-dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="danger-button" type="button" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </section>
    </div>
  )
}
