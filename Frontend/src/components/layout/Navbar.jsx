import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, PanelLeftClose, PanelLeftOpen, Sun, Moon, User as UserIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { useSidebar } from './Layout'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { getNotifications, markAsRead, markAllAsRead } from '../../api/notifications'
import ZeltxxLogo from '../ui/ZeltxxLogo'

const Navbar = () => {
  const { user, logout } = useAuth()
  const socket = useSocket()
  const { sidebarState, toggleSidebar, mobileOpen, toggleMobileSidebar } = useSidebar()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('zeltxx_theme') || 'light')

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
    localStorage.setItem('zeltxx_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const fetchNotifications = useCallback(() => {
    return getNotifications()
      .then((res) => setNotifications(res.data))
      .catch((err) => console.error(err))
  }, [])

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user, fetchNotifications])

  useEffect(() => {
    if (!socket || !user?._id) return
    socket.emit('join_user', user._id)

    const handleNewNotif = (notif) => {
      setNotifications((prev) => {
        if (prev.some((n) => n._id === notif._id)) return prev
        return [notif, ...prev]
      })
    }

    socket.on('notification', handleNewNotif)
    return () => {
      socket.off('notification', handleNewNotif)
    }
  }, [socket, user])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleNotifOpenChange = (isOpen) => {
    setNotifOpen(isOpen)
    if (isOpen) {
      setLoadingNotifs(true)
      fetchNotifications().finally(() => setLoadingNotifs(false))
    }
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await markAsRead(notification._id)
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        )
      } catch (err) {
        console.error(err)
      }
    }
    setNotifOpen(false)
    const projectId = notification.project?._id || notification.project
    if (projectId) navigate(`/projects/${projectId}`)
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return
    try {
      await markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const sidebarExpanded = sidebarState === 'expanded'

  const handleToggle = () => {
    toggleMobileSidebar()
    toggleSidebar()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-slate-800 bg-[#0f172a] px-3 sm:px-6 text-white shadow-xs">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleToggle}
          aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={mobileOpen || sidebarExpanded}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {sidebarExpanded ? (
            <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
        <ZeltxxLogo iconSize="h-7 w-7" textSize="text-lg" />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <DropdownMenu open={notifOpen} onOpenChange={handleNotifOpenChange}>
          <DropdownMenuTrigger
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : 'Notifications'
            }
            className="relative rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          >
            <Bell className="h-5 w-5 text-slate-300" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white"
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 sm:w-80 max-w-[calc(100vw-2rem)]">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="px-1.5 py-1 text-xs font-medium text-slate-400">
                Notifications
              </span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleMarkAllRead}
                  className="h-auto px-2 py-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  Mark all read
                </Button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                No notifications
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <DropdownMenuItem
                    key={n._id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex flex-col items-start gap-0.5 px-3 py-2 text-xs cursor-pointer ${
                      !n.read ? 'bg-slate-800/80 font-medium' : ''
                    }`}
                  >
                    <span className="text-slate-200">{n.message}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} alt="" />
              <AvatarFallback className="bg-blue-600 text-xs font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium text-slate-200 sm:inline">
              {user?.name}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="font-normal">
              <p className="text-sm font-medium text-[#1a1a2e]">{user?.name}</p>
              <p className="text-xs text-[#9ca3af]">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserIcon className="h-4 w-4" aria-hidden="true" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-[#dc2626] focus:text-[#dc2626]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default Navbar
