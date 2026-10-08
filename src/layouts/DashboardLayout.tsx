import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNavigation } from '../components/layout/BottomNavigation.tsx'
import { Header } from '../components/layout/Header.tsx'
import { OfflineBanner } from '../components/layout/OfflineBanner.tsx'
import { Sidebar } from '../components/layout/Sidebar.tsx'
import { useAuth } from '../context/useAuth.ts'

const sidebarStorageKey = 'studentos-sidebar-collapsed'

export function DashboardLayout() {
  const { user } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem(sidebarStorageKey) === 'true',
  )

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const nextValue = !collapsed
      window.localStorage.setItem(sidebarStorageKey, String(nextValue))
      return nextValue
    })
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={false}
        onClose={() => undefined}
        onToggleCollapse={toggleSidebar}
      />
      <div className="app-main">
        <Header key={user?.uid ?? 'signed-out'} />
        <OfflineBanner />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      <BottomNavigation />
    </div>
  )
}
