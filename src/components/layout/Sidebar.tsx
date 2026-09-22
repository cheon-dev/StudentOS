import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { navigationSections } from '../../config/navigation.ts'

type SidebarProps = {
  collapsed: boolean
  mobileOpen: boolean
  onClose: () => void
  onToggleCollapse: () => void
}

export function Sidebar({ collapsed, mobileOpen, onClose, onToggleCollapse }: SidebarProps) {
  return (
    <aside className={`sidebar${mobileOpen ? ' sidebar--mobile-open' : ''}`}>
      <div className="sidebar-header">
        <Link className="sidebar-brand" to="/dashboard" onClick={onClose}>
          <span className="sidebar-brand-mark">S</span>
          <span className="sidebar-brand-name">StudentOS</span>
        </Link>
        <button
          className="sidebar-mobile-close"
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X size={19} strokeWidth={1.8} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigationSections.map((section) => (
          <div className="sidebar-section" key={section.label}>
            <p className="sidebar-section-label">{section.label}</p>
            <div className="sidebar-section-items">
              {section.items.map((item) => {
                const Icon = item.icon

                return (
                  <NavLink
                    className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
                    end={item.path === '/dashboard'}
                    key={item.path}
                    title={collapsed ? item.label : undefined}
                    to={item.path}
                    onClick={onClose}
                  >
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    <span className="sidebar-link-label">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-collapse-button"
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapse}
        >
          {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.8} /> : <PanelLeftClose size={18} strokeWidth={1.8} />}
          <span className="sidebar-link-label">{collapsed ? 'Expand menu' : 'Collapse menu'}</span>
        </button>
      </div>
    </aside>
  )
}
