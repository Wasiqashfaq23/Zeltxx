const typeStyles = {
  commit: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  comment: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  review: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  task_complete: 'bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:text-white',
  file_upload: 'bg-slate-800 text-white border-slate-700 dark:bg-slate-900 dark:text-slate-100'
}

const typeLabels = {
  commit: 'Commit',
  comment: 'Comment',
  review: 'Review',
  task_complete: 'Task Complete',
  file_upload: 'File Upload'
}

const ContribBadge = ({ type }) => {
  const style = typeStyles[type] || 'bg-[#f4f4f7] text-[#6b7280] border-[#e8e8ef]'
  const label = typeLabels[type] || type

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}

export default ContribBadge
