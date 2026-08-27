import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  BarChart2,
  Users,
  User as UserIcon,
  LogOut
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSidebar } from './Layout'
import { getProjects } from '../../api/projects'
import { Button } from '@/components/ui/button'

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all mx-2 ${
    isActive
      ? 'bg-blue-600 text-white font-semibold shadow-sm'
      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
  }`

const Sidebar = () => {
  const { user, logout } = useAuth()
  const { sidebarState, mobileOpen, closeMobileSidebar } = useSidebar()
  const [isProjectAdmin, setIsProjectAdmin] = useState(false)
  const collapsed = sidebarState === 'collapsed'
  const widthClass = collapsed ? 'md:w-14' : 'md:w-56'

  useEffect(() => {
    getProjects()
      .then((res) => {
        const adminOnAny = res.data.some((project) =>
          project.members.some(
            (m) =>
              (m.user._id || m.user) === user?._id && m.role === 'admin'
          )
        )
        setIsProjectAdmin(adminOnAny)
      })
      .catch((err) => console.error(err))
  }, [user])

  const navItems = [
    { to: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard, show: true },
    {
      to: '/admin/projects',
      label: 'Project Workspace',
      icon: FolderKanban,
      show: isProjectAdmin
    },
    { to: '/stats', label: 'Leaderboard & Stats', icon: BarChart2, show: true },
    { to: '/profile', label: 'My Profile', icon: UserIcon, show: true },
    { to: '/admin/users', label: 'User Directory', icon: Users, show: isProjectAdmin }
  ].filter((item) => item.show)

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer - Permanent Dark Theme */}
      <aside
        className={`fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-56 flex-col justify-between border-r border-slate-800 bg-[#0f172a] text-slate-200 py-4 transition-all duration-200 ${widthClass} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        aria-label="Sidebar"
      >
        <nav className="space-y-1.5" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMobileSidebar}
              className={navLinkClass}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
            >
              <Icon className={`h-5 w-5 shrink-0 ${collapsed ? 'md:mx-auto' : ''}`} aria-hidden="true" />
              <span className={collapsed ? 'inline md:hidden' : 'inline'}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-2">
          <Button
            variant="ghost"
            className={`w-full text-slate-400 hover:bg-slate-800/80 hover:text-red-400 ${collapsed ? 'justify-start md:justify-center md:px-0' : 'justify-start'}`}
            onClick={() => {
              closeMobileSidebar()
              logout()
            }}
            aria-label="Log out"
            title={collapsed ? 'Log out' : undefined}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className={collapsed ? 'ml-2 inline md:hidden' : 'ml-2 inline'}>Logout</span>
          </Button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
