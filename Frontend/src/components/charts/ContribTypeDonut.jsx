import { PieChart, Pie, Tooltip, Cell, Legend, ResponsiveContainer } from 'recharts'
import { breakdownToPieData } from '../../utils/chartHelpers'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444']

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f8fafc',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)',
  fontSize: '12px'
}

const ContribTypeDonut = ({ breakdown }) => {
  const data = breakdownToPieData(breakdown)

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
        No contribution data recorded yet
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
          formatter={(v) => <span style={{ color: '#94a3b8', fontSize: '12px' }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default ContribTypeDonut
