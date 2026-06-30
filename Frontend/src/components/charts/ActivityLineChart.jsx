import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts'
import { snapshotsToLineData } from '../../utils/chartHelpers'

const COLORS = ['#4f46e5', '#16a34a', '#d97706', '#0891b2', '#9333ea', '#dc2626']

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e8e8ef',
  borderRadius: '8px',
  color: '#1a1a2e',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  fontSize: '12px'
}

const ActivityLineChart = ({ snapshots, members }) => {
  const lineData = snapshotsToLineData(snapshots)
  const userNames = (members || [])
    .map((member) => member.user?.name)
    .filter(Boolean)

  if (!lineData.length || !userNames.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-[#9ca3af]">
        No data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={lineData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ef" vertical={false} />
        <XAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => <span style={{ color: '#6b7280', fontSize: '12px' }}>{v}</span>}
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
