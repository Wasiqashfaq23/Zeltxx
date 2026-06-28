import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts'
import { snapshotsToLineData } from '../../utils/chartHelpers'

const ActivityLineChart = ({ snapshots, members }) => {
  const lineData = snapshotsToLineData(snapshots)
  const userNames = (members || []).map((member) => member.name).filter(Boolean)

  if (!lineData.length || !userNames.length) return <div>No data yet</div>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={lineData}>
        <CartesianGrid />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        {userNames.map((name) => (
          <Line key={name} type="monotone" dataKey={name} stroke="#8884d8" />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export default ActivityLineChart
