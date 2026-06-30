import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  BarChart2,
  Users,
  LogOut
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSidebar } from './Layout'
import { Button } from '@/components/ui/button'

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mx-2 ${
    isActive
      ? 'bg-[#ede9fe] text-[#4f46e5]'
      : 'text-[#6b7280] hover:bg-[#f4f4f7] hover:text-[#1a1a2e]'
  }`

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { to: '/stats', label: 'My Stats', icon: BarChart2 },
  { to: '/admin/users', label: 'Users', icon: Users }
]

const Sidebar = () => {
  const { logout } = useAuth()
  const { sidebarState } = useSidebar()
  const collapsed = sidebarState === 'collapsed'
  const hidden = sidebarState === 'hidden'

  const widthClass = hidden ? 'w-0 overflow-hidden' : collapsed ? 'w-14' : 'w-56'

  return (
    <aside
      className={`fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] flex-col justify-between border-r border-[#e8e8ef] bg-white py-3 transition-all duration-200 ${widthClass}`}
    >
      <nav className="space-y-1" aria-label="Main navigation">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={navLinkClass}
            title={collapsed ? label : undefined}
          >
            <Icon className={`h-5 w-5 shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-2">
        <Button
          variant="ghost"
          className={`w-full hover:text-[#dc2626] ${collapsed ? 'justify-center px-0' : 'justify-start'} text-[#6b7280]`}
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar