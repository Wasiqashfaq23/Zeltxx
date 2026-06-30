import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { snapshotsToAreaData } from '../../utils/chartHelpers'

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e8e8ef',
  borderRadius: '8px',
  color: '#1a1a2e',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  fontSize: '12px'
}

const PersonalAreaChart = ({ snapshots, userId }) => {
  const data = snapshotsToAreaData(snapshots, userId)

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-[#9ca3af]">
        No data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ef" vertical={false} />
        <XAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="count" stroke="#4f46e5" fill="#ede9fe" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default PersonalAreaChart
