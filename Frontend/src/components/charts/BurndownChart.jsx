import { useState, useEffect, memo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts'
import { getBurndown } from '../../api/sprints'

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f8fafc',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)',
  fontSize: '12px'
}

const axisTick = { fill: '#94a3b8', fontSize: 12 }

const BurndownChart = ({ sprintId }) => {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!sprintId) {
      setData(null)
      return
    }
    getBurndown(sprintId)
      .then((res) => {
        const { dates, ideal, actual } = res.data
        setData(dates.map((d, i) => ({ date: d.slice(5), Ideal: ideal[i], Remaining: actual[i] })))
      })
      .catch((err) => console.error(err))
  }, [sprintId])

  if (!data) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Loading burndown...
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#94a3b8', fontSize: '12px' }}>{v}</span>} />
        <Line type="monotone" dataKey="Ideal" stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Remaining" stroke="#2563eb" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default memo(BurndownChart)