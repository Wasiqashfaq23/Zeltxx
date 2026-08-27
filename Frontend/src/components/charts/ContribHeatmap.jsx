import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ContribHeatmap = ({ snapshots }) => {
  const days = useMemo(() => {
    const dates = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      dates.push({ dateStr, dayLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: 0 })
    }

    if (snapshots && snapshots.length) {
      snapshots.forEach((s) => {
        const sDate = s.date ? new Date(s.date).toISOString().split('T')[0] : null
        if (sDate) {
          const found = dates.find((d) => d.dateStr === sDate)
          if (found) {
            found.count += s.totalCount || 0
          }
        }
      })
    }

    return dates
  }, [snapshots])

  const getColorClass = (count) => {
    if (count === 0) return 'bg-[#f4f4f7] border-[#e8e8ef]'
    if (count <= 2) return 'bg-indigo-100 border-indigo-200 text-indigo-700'
    if (count <= 5) return 'bg-indigo-300 border-indigo-400 text-indigo-900'
    return 'bg-[#4f46e5] border-[#4338ca] text-white'
  }

  return (
    <Card className="border-[#e8e8ef] bg-white shadow-sm">
      <CardHeader className="border-b border-[#e8e8ef] px-5 py-3">
        <CardTitle className="text-sm font-semibold text-[#1a1a2e]">
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

export default ContribHeatmap
