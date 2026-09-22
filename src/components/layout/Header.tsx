import { useEffect, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getPageTitle } from '../../config/navigation.ts'
import { useAuth } from '../../context/useAuth.ts'
import { useTheme } from '../../context/useTheme.ts'
import { auth } from '../../firebase/config.ts'
import { subscribeToEvents } from '../../services/calendarService.ts'
import { subscribeToProjects } from '../../services/projectService.ts'
import { ensureSmartNotifications, getNotificationPreferences, markAllNotificationsRead, markNotificationRead, subscribeToNotifications } from '../../services/notificationService.ts'
import { subscribeToTasks } from '../../services/taskService.ts'
import type { CalendarEvent } from '../../types/calendar.ts'
import type { Notification, NotificationPreferences } from '../../types/notification.ts'
import type { Project } from '../../types/project.ts'
import type { Task } from '../../types/task.ts'
import { getUserInitials } from '../../utils/user.ts'

type HeaderProps = {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, profile, avatarUrl } = useAuth()
  const { preference, setPreference } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null)
  const [notificationTasks, setNotificationTasks] = useState<Task[]>([])
  const [notificationEvents, setNotificationEvents] = useState<CalendarEvent[]>([])
  const [notificationProjects, setNotificationProjects] = useState<Project[]>([])
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const notificationMenuRef = useRef<HTMLDivElement | null>(null)
  const initials = getUserInitials(profile?.displayName || user?.displayName, user?.email)

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) setNotificationOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpen(false)
        setNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    let active = true
    const unsubscribe = subscribeToNotifications(user.uid, setNotifications, () => setNotifications([]))
    const tasksUnsubscribe = subscribeToTasks(user.uid, setNotificationTasks, () => setNotificationTasks([]))
    const eventsUnsubscribe = subscribeToEvents(user.uid, setNotificationEvents, () => setNotificationEvents([]))
    const projectsUnsubscribe = subscribeToProjects(user.uid, setNotificationProjects, () => setNotificationProjects([]))
    void getNotificationPreferences(user.uid).then((preferences) => { if (active) setNotificationPreferences(preferences) }).catch(() => { if (active) setNotificationPreferences(null) })
    return () => { active = false; unsubscribe(); tasksUnsubscribe(); eventsUnsubscribe(); projectsUnsubscribe() }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid || !notificationPreferences) return
    void ensureSmartNotifications(user.uid, notificationTasks, notificationEvents, notificationProjects, notificationPreferences).catch(() => undefined)
  }, [notificationEvents, notificationPreferences, notificationProjects, notificationTasks, user?.uid])

  async function handleLogout() {
    await signOut(auth)
    navigate('/login', { replace: true })
  }

  const unreadCount = notifications.filter((notification) => !notification.read).length
  const recentNotifications = notifications.slice(0, 5)

  return (
    <header className="app-header">
      <div className="header-leading">
        <button className="header-menu-button" type="button" aria-label="Open navigation" onClick={onMenuClick}>
          <Menu size={21} strokeWidth={1.8} />
        </button>
        <div>
          <p className="header-kicker">StudentOS workspace</p>
          <h1 className="header-title">{getPageTitle(location.pathname)}</h1>
        </div>
      </div>

      <div className="header-actions">
        <label className="header-search">
          <Search size={17} strokeWidth={1.8} aria-hidden="true" />
          <input type="search" placeholder="Search workspace" aria-label="Search workspace" />
        </label>
        <div className="notification-menu-wrapper" ref={notificationMenuRef}>
          <button className="header-icon-button" type="button" aria-label="Notifications" aria-expanded={notificationOpen} onClick={() => setNotificationOpen((open) => !open)}>
            <Bell size={19} strokeWidth={1.8} />
            {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          {notificationOpen && <div className="notification-menu" role="dialog" aria-label="Recent notifications"><div className="notification-menu-heading"><strong>Notifications</strong><button type="button" onClick={() => user?.uid && void markAllNotificationsRead(user.uid)}>Mark all read</button></div>{recentNotifications.length === 0 ? <p className="notification-menu-empty">No notifications yet.</p> : recentNotifications.map((notification) => <button className={notification.read ? 'notification-menu-item' : 'notification-menu-item notification-menu-item--unread'} type="button" key={notification.id} onClick={() => { if (user?.uid) void markNotificationRead(user.uid, notification.id); setNotificationOpen(false); navigate('/notifications') }}><span className="notification-menu-item-dot" /><span><strong>{notification.title}</strong><small>{notification.message}</small></span></button>)}<Link className="notification-menu-footer" to="/notifications" onClick={() => setNotificationOpen(false)}>View all notifications</Link></div>}
        </div>
        <div className="profile-menu-wrapper" ref={profileMenuRef}>
          <button
            className="header-profile-button"
            type="button"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            onClick={() => setProfileOpen((open) => !open)}
          >
            {avatarUrl || user?.photoURL ? (
              <img className="header-avatar" src={avatarUrl || user?.photoURL || ''} alt="" />
            ) : (
              <span className="header-avatar header-avatar--fallback">{initials}</span>
            )}
            <span className="header-user-details">
               <strong>{profile?.displayName || user?.displayName || 'Student'}</strong>
              <small>{user?.email}</small>
            </span>
            <ChevronDown className="header-profile-chevron" size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>

          {profileOpen && (
            <div className="profile-menu" role="menu">
              <div className="profile-menu-user">
                 <span className="profile-menu-name">{profile?.displayName || user?.displayName || 'Student'}</span>
                <span className="profile-menu-email">{user?.email}</span>
              </div>
              <Link className="profile-menu-link" role="menuitem" to="/profile" onClick={() => setProfileOpen(false)}>
                <UserRound size={16} strokeWidth={1.8} />
                Profile
              </Link>
              <Link className="profile-menu-link" role="menuitem" to="/settings" onClick={() => setProfileOpen(false)}>
                <Settings size={16} strokeWidth={1.8} />
                Settings
              </Link>
              <div className="theme-picker" aria-label="Theme preference">
                <span>Theme</span>
                <div className="theme-options">
                  <button className={preference === 'light' ? 'theme-option theme-option--active' : 'theme-option'} type="button" aria-label="Light theme" onClick={() => setPreference('light')}>
                    <Sun size={14} strokeWidth={1.8} />
                  </button>
                  <button className={preference === 'dark' ? 'theme-option theme-option--active' : 'theme-option'} type="button" aria-label="Dark theme" onClick={() => setPreference('dark')}>
                    <Moon size={14} strokeWidth={1.8} />
                  </button>
                  <button className={preference === 'system' ? 'theme-option theme-option--active' : 'theme-option'} type="button" aria-label="System theme" onClick={() => setPreference('system')}>
                    <Monitor size={14} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
              <button className="profile-menu-link profile-menu-link--logout" type="button" role="menuitem" onClick={handleLogout}>
                <LogOut size={16} strokeWidth={1.8} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
