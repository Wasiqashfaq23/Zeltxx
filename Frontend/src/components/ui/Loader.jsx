const Loader = () => {
  return (
    <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8e8ef] border-t-[#4f46e5]" />
    </div>
  )
}

export default Loader
