import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e8e8ef',
  borderRadius: '8px',
  color: '#1a1a2e',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  fontSize: '12px'
}

const ContributionBarChart = ({ summary }) => {
  if (!summary || !summary.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-[#9ca3af]">
        No data yet
      </div>
    )
  }

  const data = summary.map((s) => ({
    name: s.user.name,
    contributions: s.totalCount,
    score: s.totalWeight
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ef" vertical={false} />
        <XAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="contributions" fill="#4f46e5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default ContributionBarChart
