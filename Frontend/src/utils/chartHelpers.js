// convert breakdown array to pie chart data
export const breakdownToPieData = (breakdown) => {
  if (!breakdown || !breakdown.length) return []
  const counts = breakdown.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

// convert snapshots to line chart data grouped by date
export const snapshotsToLineData = (snapshots) => {
  if (!snapshots || !snapshots.length) return []
  const grouped = {}
  snapshots.forEach((s) => {
    const date = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!grouped[date]) grouped[date] = { date }
    grouped[date][s.user.name] = s.totalCount
  })
  return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date))
}

// convert snapshots to area chart data for one user
export const snapshotsToAreaData = (snapshots, userId) => {
  if (!snapshots || !snapshots.length) return []
  return snapshots
    .filter((s) => s.user._id === userId)
    .map((s) => ({
      date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: s.totalCount,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

// get date string for N days ago
export const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
