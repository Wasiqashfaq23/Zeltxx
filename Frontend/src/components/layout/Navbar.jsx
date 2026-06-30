import { Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const Navbar = () => {
  const { user } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-[#e8e8ef] bg-white px-6">
      <div className="flex items-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4f46e5] text-sm font-bold text-white">
          Z
        </div>
        <span className="ml-2 text-lg font-semibold text-[#1a1a2e]">zeltxx</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Bell className="h-5 w-5 text-[#6b7280]" aria-hidden="true" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
        </div>

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
