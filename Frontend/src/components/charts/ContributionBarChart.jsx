import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f8fafc',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)',
  fontSize: '12px'
}

const ContributionBarChart = ({ summary }) => {
  if (!summary || !summary.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
        No data available yet
      </div>
    )
  }

  const data = summary.map((s, idx) => ({
    name: s.user?.name || `Member ${idx + 1}`,
    contributions: s.totalCount || 0,
    score: s.totalWeight || 0
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#1e293b' }} />
        <Bar dataKey="contributions" fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default ContributionBarChart
