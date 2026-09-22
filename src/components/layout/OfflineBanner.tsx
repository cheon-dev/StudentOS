import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus.ts'

export function OfflineBanner() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <WifiOff size={16} aria-hidden="true" />
      <span>
        You&apos;re offline. Cached data is available, and changes will sync when you reconnect.
      </span>
    </div>
  )
}
