import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Brain,
  CalendarDays,
  FolderKanban,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  QrCode,
  Receipt,
  Settings,
  Timer,
} from 'lucide-react'

export type NavigationItem = {
  label: string
  path: string
  icon: LucideIcon
}

export type NavigationSection = {
  label: string
  items: NavigationItem[]
}

export const navigationSections: NavigationSection[] = [
  {
    label: 'Main',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Academic',
    items: [
      { label: 'Subjects', path: '/subjects', icon: BookOpen },
      { label: 'Tasks & Deadlines', path: '/tasks', icon: ListTodo },
      { label: 'Calendar', path: '/calendar', icon: CalendarDays },
      { label: 'Notes', path: '/notes', icon: NotebookPen },
      { label: 'Smart Reviewer', path: '/reviewer', icon: Brain },
    ],
  },
  {
    label: 'Productivity',
    items: [
      { label: 'Projects', path: '/projects', icon: FolderKanban },
      { label: 'Study Timer', path: '/study', icon: Timer },
      { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Personal',
    items: [
      { label: 'Expenses', path: '/expenses', icon: Receipt },
      { label: 'Inventory', path: '/inventory', icon: QrCode },
      { label: 'Password Vault', path: '/vault', icon: KeyRound },
    ],
  },
  {
    label: 'Storage',
    items: [{ label: 'My Files', path: '/files', icon: FolderOpen }],
  },
  {
    label: 'AI',
    items: [{ label: 'Student Assistant', path: '/assistant', icon: Bot }],
  },
  {
    label: 'System',
    items: [
      { label: 'Notifications', path: '/notifications', icon: Bell },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
]

export function getPageTitle(pathname: string) {
  for (const section of navigationSections) {
    const item = section.items.find((navigationItem) => pathname === navigationItem.path || pathname.startsWith(`${navigationItem.path}/`))

    if (item) {
      return item.label
    }
  }

  return 'Dashboard'
}
