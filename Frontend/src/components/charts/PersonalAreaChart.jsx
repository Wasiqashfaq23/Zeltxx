import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { snapshotsToAreaData } from '../../utils/chartHelpers'

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f8fafc',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)',
  fontSize: '12px'
}

const PersonalAreaChart = ({ snapshots, userId }) => {
  const data = snapshotsToAreaData(snapshots, userId)

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
        No activity snapshots recorded yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="count" stroke="#2563eb" fill="url(#colorCount)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default PersonalAreaChart
