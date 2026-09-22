import { CheckCircle2, X } from 'lucide-react'

type ToastProps = {
  message: string
  tone?: 'success' | 'error'
  onClose: () => void
}

export function Toast({ message, tone = 'success', onClose }: ToastProps) {
  return (
    <div className={`subjects-toast subjects-toast--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <CheckCircle2 size={17} strokeWidth={1.8} />
      <span>{message}</span>
      <button type="button" aria-label="Dismiss message" onClick={onClose}>
        <X size={16} strokeWidth={1.8} />
      </button>
    </div>
  )
}
