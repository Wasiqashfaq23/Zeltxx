import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { getNotifications, markAllAsRead } from '../../api/notifications'

const Navbar = () => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    getNotifications()
      .then(res => setNotifications(res.data))
      .catch(err => console.error(err))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleOpen = async (isOpen) => {
    setOpen(isOpen)
    if (isOpen && unreadCount > 0) {
      await markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-[#e8e8ef] bg-white px-6">
      <div className="flex items-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4f46e5] text-sm font-bold text-white">
          Z
        </div>
        <span className="ml-2 text-lg font-semibold text-[#1a1a2e]">zeltxx</span>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu open={open} onOpenChange={handleOpen}>
          <DropdownMenuTrigger asChild>
            <button className="relative rounded-lg p-2 transition-colors hover:bg-[#f4f4f7]">
              <Bell className="h-5 w-5 text-[#6b7280]" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-[#9ca3af]">
                No notifications yet
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map(n => (
                  <DropdownMenuItem key={n._id} className="flex flex-col items-start gap-0.5 py-2">
                    <p className="text-sm text-[#1a1a2e]">{n.message}</p>
                    <p className="text-xs text-[#9ca3af]">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatar} alt={user?.name} />
          <AvatarFallback className="bg-[#ede9fe] text-sm text-[#4f46e5]">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <span className="text-sm font-medium text-[#6b7280]">{user?.name}</span>
      </div>
    </header>
  )
}

export default Navbar
