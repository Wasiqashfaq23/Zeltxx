import { PieChart, Pie, Tooltip, Cell, Legend, ResponsiveContainer } from 'recharts'
import { breakdownToPieData } from '../../utils/chartHelpers'

const COLORS = ['#4f46e5', '#16a34a', '#d97706', '#0891b2', '#9333ea', '#dc2626']

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e8e8ef',
  borderRadius: '8px',
  color: '#1a1a2e',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  fontSize: '12px'
}

const ContribTypeDonut = ({ breakdown }) => {
  const data = breakdownToPieData(breakdown)

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-[#9ca3af]">
        No data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => <span style={{ color: '#6b7280', fontSize: '12px' }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default ContribTypeDonut
