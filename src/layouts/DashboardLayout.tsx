import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const nextValue = !collapsed
      window.localStorage.setItem(sidebarStorageKey, String(nextValue))
      return nextValue
    })
  }

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileSidebarOpen(false)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileSidebarOpen])

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onToggleCollapse={toggleSidebar}
      />
      {mobileSidebarOpen && (
        <button
          className="mobile-sidebar-overlay"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <div className="app-main">
        <Header key={user?.uid ?? 'signed-out'} onMenuClick={() => setMobileSidebarOpen(true)} />
        <OfflineBanner />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
