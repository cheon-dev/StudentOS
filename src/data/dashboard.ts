import type { LucideIcon } from 'lucide-react'

export type DashboardStat = {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone: 'purple' | 'blue' | 'orange' | 'green'
  demo?: boolean
}
