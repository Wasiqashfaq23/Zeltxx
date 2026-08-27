import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const sizeMap = {
  xs: 'h-6 w-6 text-[8px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base'
}

const UserAvatar = ({ user, size = 'md', className }) => {
  const initials = user?.name?.charAt(0).toUpperCase() || '?'

  return (
    <Avatar title={user?.statusText ? `${user.name} (${user.statusText})` : user?.name} className={cn(sizeMap[size], className)}>
      <AvatarImage src={user?.avatar} alt={user?.name} />
      <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export const MemberAvatarStack = ({ members = [] }) => {
  return (
    <div className="flex -space-x-2">
      {members.slice(0, 3).map((m) => (
        <Avatar key={m.user._id || m.user} className="h-6 w-6 border-2 border-white">
          <AvatarImage src={m.user.avatar} />
          <AvatarFallback className="bg-blue-50 text-[8px] text-blue-600 font-semibold">
            {m.user.name?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      ))}
      {members.length > 3 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#f4f4f7] text-[10px] font-medium text-[#6b7280]">
          +{members.length - 3}
        </div>
      )}
    </div>
  )
}

export default UserAvatar
