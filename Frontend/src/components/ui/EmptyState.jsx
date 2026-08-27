import { Button } from '@/components/ui/button'

const EmptyState = ({ message, icon, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 max-w-sm">{message}</p>
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-4 bg-blue-600 text-white hover:bg-blue-700 font-medium"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
