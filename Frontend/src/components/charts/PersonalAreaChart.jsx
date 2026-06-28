import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { snapshotsToAreaData } from '../../utils/chartHelpers'

const PersonalAreaChart = ({ snapshots, userId }) => {
  const data = snapshotsToAreaData(snapshots, userId)

  if (!data.length) return <div>No data yet</div>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default PersonalAreaChart
