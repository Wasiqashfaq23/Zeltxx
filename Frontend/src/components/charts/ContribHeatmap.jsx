import { useMemo, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ContribHeatmap = ({ snapshots = [], contributions = [] }) => {
  const days = useMemo(() => {
    const dates = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      dates.push({ dateStr, dayLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: 0 })
    }

    if (snapshots && snapshots.length > 0) {
      snapshots.forEach((s) => {
        const rawDate = s.date || s.createdAt
        const sDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : null
        if (sDate) {
          const found = dates.find((d) => d.dateStr === sDate)
          if (found) {
            found.count += s.totalCount || s.totalWeight || 1
          }
        }
      })
    } else if (contributions && contributions.length > 0) {
      // Weight by contribution type so a day of commits (4pt) outweighs bare comments.
      contributions.forEach((c) => {
        const cDate = c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : null
        if (cDate) {
          const found = dates.find((d) => d.dateStr === cDate)
          if (found) {
            found.count += c.weight || 1
          }
        }
      })
    }

    return dates
  }, [snapshots, contributions])

  const getColorClass = (count) => {
    if (count === 0) return 'bg-slate-800/60 border-slate-800 text-slate-400'
    if (count <= 2) return 'bg-blue-950 border-blue-800 text-blue-300'
    if (count <= 5) return 'bg-blue-700 border-blue-600 text-white'
    return 'bg-blue-600 border-blue-500 text-white shadow-xs'
  }

  return (
    <Card className="border-slate-800 bg-slate-900 shadow-xs">
      <CardHeader className="border-b border-slate-800 px-5 py-3">
        <CardTitle className="text-sm font-semibold text-slate-100">
          30-Day Contribution Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2">
          {days.map((d) => (
            <div
              key={d.dateStr}
              title={`${d.dayLabel}: ${d.count} contributions`}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all hover:scale-105 ${getColorClass(
                d.count
              )}`}
            >
              <span className="text-[10px] font-medium opacity-80">{d.dayLabel}</span>
              <span className="text-xs font-bold mt-0.5">{d.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default memo(ContribHeatmap)
