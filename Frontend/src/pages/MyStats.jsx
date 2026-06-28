import { useEffect, useState } from 'react'
import { getProjects } from '../api/projects'
import { getProjectSummary } from '../api/contributions'
import { getSnapshotsByRange } from '../api/snapshots'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'
import StatCard from '../components/ui/StatCard'
import PersonalAreaChart from '../components/charts/PersonalAreaChart'
import ContribTypeDonut from '../components/charts/ContribTypeDonut'
import { daysAgo } from '../utils/chartHelpers'

const MyStats = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projectStats, setProjectStats] = useState([])
  const [allSnapshots, setAllSnapshots] = useState([])

  useEffect(() => {
    getProjects()
      .then(async (res) => {
        const projects = res.data
        const stats = await Promise.all(
          projects.map(async (project) => {
            const summaryRes = await getProjectSummary(project._id)
            const snapshotsRes = await getSnapshotsByRange(
              project._id,
              daysAgo(14),
              new Date().toISOString().split('T')[0]
            )
            const summary = summaryRes.data
            const ranked = [...summary].sort((a, b) => b.totalWeight - a.totalWeight)
            const userIndex = ranked.findIndex(
              (entry) => entry.user._id === user._id || entry._id === user._id
            )
            return {
              project,
              userEntry: userIndex >= 0 ? ranked[userIndex] : null,
              rank: userIndex >= 0 ? userIndex + 1 : null,
              snapshots: snapshotsRes.data
            }
          })
        )
        setProjectStats(stats)
        setAllSnapshots(stats.flatMap((stat) => stat.snapshots || []))
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <Loader />

  const totalContributions = projectStats.reduce(
    (sum, { userEntry }) => sum + (userEntry?.totalCount || 0),
    0
  )
  const totalWeight = projectStats.reduce(
    (sum, { userEntry }) => sum + (userEntry?.totalWeight || 0),
    0
  )

  const typeBreakdown = {}
  projectStats.forEach(({ userEntry }) => {
    userEntry?.breakdown?.forEach((type) => {
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1
    })
  })

  const allBreakdowns = projectStats.flatMap(({ userEntry }) => userEntry?.breakdown || [])
  const contributionTypes = ['commit', 'comment', 'task_complete', 'file_upload', 'review']

  return (
    <div>
      <Navbar />
      <Sidebar />
      <main>
        <h1>My Stats</h1>

        {projectStats.length === 0 ? (
          <EmptyState message="You are not part of any projects yet" />
        ) : (
          <>
            <PersonalAreaChart snapshots={allSnapshots} userId={user._id} />
            <ContribTypeDonut breakdown={allBreakdowns} />

            <div>
              <StatCard label="Total Contributions" value={totalContributions} />
              <StatCard label="Total Weight Score" value={totalWeight} />
            </div>

            <h2>Per Project</h2>
            <div>
              {projectStats.map(({ project, userEntry, rank }) => (
                <div key={project._id}>
                  <h3>{project.name}</h3>
                  <p>Contributions: {userEntry?.totalCount || 0}</p>
                  <p>Weight Score: {userEntry?.totalWeight || 0}</p>
                  <p>Rank: {rank || '—'}</p>
                </div>
              ))}
            </div>

            <h2>Contribution Types</h2>
            <div>
              {contributionTypes.map((type) => (
                <StatCard
                  key={type}
                  label={type}
                  value={typeBreakdown[type] || 0}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default MyStats
