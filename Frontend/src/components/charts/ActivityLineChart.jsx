import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts'
import { snapshotsToLineData } from '../../utils/chartHelpers'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444']

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f8fafc',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)',
  fontSize: '12px'
}

const ActivityLineChart = ({ snapshots, members }) => {
  const lineData = snapshotsToLineData(snapshots)
  const userNames = (members || [])
    .map((member) => member.user?.name)
    .filter(Boolean)

  if (!lineData.length || !userNames.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
        No activity snapshots yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={lineData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => <span style={{ color: '#94a3b8', fontSize: '12px' }}>{v}</span>}
        />
        {userNames.map((name, index) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export default ActivityLineChart
