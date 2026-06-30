const typeStyles = {
  commit: 'bg-[#ede9fe] text-[#4f46e5] border-[#c7d2fe]',
  comment: 'bg-[#dcfce7] text-[#16a34a] border-[#bbf7d0]',
  review: 'bg-[#fef3c7] text-[#d97706] border-[#fde68a]',
  task_complete: 'bg-[#cffafe] text-[#0891b2] border-[#a5f3fc]',
  file_upload: 'bg-[#f3e8ff] text-[#9333ea] border-[#e9d5ff]'
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
