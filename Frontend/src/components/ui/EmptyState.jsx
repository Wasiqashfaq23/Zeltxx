import { Button } from '@/components/ui/button'

const EmptyState = ({ message, icon, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#e8e8ef] bg-[#f4f4f7] text-[#9ca3af]">
        {icon}
      </div>
      <p className="text-sm font-medium text-[#6b7280]">{message}</p>
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-4 bg-[#4f46e5] text-white hover:bg-[#4338ca]"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
