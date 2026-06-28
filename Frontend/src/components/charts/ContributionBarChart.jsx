import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

const ContributionBarChart = ({ summary }) => {
  if (!summary || !summary.length) return <div>No data yet</div>

  const data = summary.map((s) => ({
    name: s.user.name,
    contributions: s.totalCount,
    score: s.totalWeight,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="contributions" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default ContributionBarChart
