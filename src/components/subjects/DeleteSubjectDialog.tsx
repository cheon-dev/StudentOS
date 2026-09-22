import { AlertTriangle, X } from 'lucide-react'
import type { Subject } from '../../types/subject.ts'

type DeleteSubjectDialogProps = {
  subject: Subject
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteSubjectDialog({ subject, deleting, onCancel, onConfirm }: DeleteSubjectDialogProps) {
  return (
    <div className="modal-layer">
      <button className="modal-backdrop" type="button" aria-label="Close delete confirmation" onClick={onCancel} />
      <section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-subject-title">
        <button className="modal-close-button" type="button" aria-label="Close dialog" onClick={onCancel}>
          <X size={18} strokeWidth={1.8} />
        </button>
        <div className="delete-dialog-icon"><AlertTriangle size={23} strokeWidth={1.8} /></div>
        <p className="dashboard-eyebrow">Remove subject</p>
        <h2 id="delete-subject-title">Delete subject?</h2>
        <p><strong>{subject.name}</strong> will be removed from StudentOS.</p>
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
