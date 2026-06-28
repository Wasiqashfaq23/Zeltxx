import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { breakdownToPieData } from '../../utils/chartHelpers'

const ContribTypeDonut = ({ breakdown }) => {
  const data = breakdownToPieData(breakdown)

  if (!data.length) return <div>No data yet</div>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} label>
          {data.map((entry) => (
            <Cell key={entry.name} fill="#8884d8" />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default ContribTypeDonut
