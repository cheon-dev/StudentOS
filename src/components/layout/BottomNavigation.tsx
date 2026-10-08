import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { navigationSections, type NavigationItem } from '../../config/navigation.ts'

const primaryPaths = ['/dashboard', '/tasks', '/calendar', '/expenses']
const navigationItems = navigationSections.flatMap((section) => section.items)

function isItemActive(item: NavigationItem, pathname: string) {
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}

export function BottomNavigation() {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const primaryItems = primaryPaths.map((path) => navigationItems.find((item) => item.path === path)).filter((item): item is NavigationItem => Boolean(item))
  const moreItems = navigationItems.filter((item) => !primaryPaths.includes(item.path))
  const moreActive = moreItems.some((item) => isItemActive(item, location.pathname))

  const moreVisible = moreOpen

  return (
    <>
      {moreVisible && (
        <button className="bottom-navigation-backdrop" type="button" aria-label="Close more navigation" onClick={() => setMoreOpen(false)} />
      )}
      {moreVisible && (
        <nav className="bottom-navigation-more" aria-label="More navigation">
          {moreItems.map((item) => {
            const Icon = item.icon
            return <NavLink className={({ isActive }) => `bottom-navigation-more-link${isActive ? ' bottom-navigation-more-link--active' : ''}`} end={item.path === '/dashboard'} key={item.path} to={item.path} onClick={() => setMoreOpen(false)}><Icon size={17} strokeWidth={1.8} /><span>{item.label}</span></NavLink>
          })}
        </nav>
      )}
      <nav className="bottom-navigation" aria-label="Main navigation">
        {primaryItems.map((item) => {
          const Icon = item.icon
          return <NavLink className={({ isActive }) => `bottom-navigation-link${isActive ? ' bottom-navigation-link--active' : ''}`} end={item.path === '/dashboard'} key={item.path} to={item.path} onClick={() => setMoreOpen(false)}><Icon size={19} strokeWidth={1.8} /><span>{item.label === 'Tasks & Deadlines' ? 'Tasks' : item.label}</span></NavLink>
        })}
        <button className={`bottom-navigation-link${moreActive || moreVisible ? ' bottom-navigation-link--active' : ''}`} type="button" aria-expanded={moreVisible} onClick={() => setMoreOpen((open) => !open)}><MoreHorizontal size={20} strokeWidth={1.8} /><span>More</span></button>
      </nav>
    </>
  )
}
