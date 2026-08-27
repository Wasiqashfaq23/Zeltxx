import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { getProjects } from '../api/projects'
import { getProjectSummary } from '../api/contributions'
import { getSnapshotsByRange } from '../api/snapshots'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'
import StatCard from '../components/ui/StatCard'
import UserAvatar from '../components/ui/UserAvatar'
import PersonalAreaChart from '../components/charts/PersonalAreaChart'
import ContribTypeDonut from '../components/charts/ContribTypeDonut'
import { daysAgo } from '../utils/chartHelpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

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

  const handleExportCSV = () => {
    if (!projectStats.length) return
    const headers = ['Project Name', 'Contributions', 'Score', 'Rank']
    const rows = projectStats.map(({ project, userEntry, rank }) => [
      `"${(project.name || '').replace(/"/g, '""')}"`,
      userEntry?.totalCount || 0,
      userEntry?.totalWeight || 0,
      rank || 'N/A'
    ])
    const csvStr = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${(user?.name || 'my').replace(/\s+/g, '_')}_stats.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) return <Loader />

  const totalContributions = projectStats.reduce(
    (sum, { userEntry }) => sum + (userEntry?.totalCount || 0),
    0
  )
  const totalWeight = projectStats.reduce(
    (sum, { userEntry }) => sum + (userEntry?.totalWeight || 0),
    0
  )

  const allBreakdowns = projectStats.flatMap(({ userEntry }) => userEntry?.breakdown || [])

  const bestSingleDay = allSnapshots
    .filter((s) => s.user._id === user._id)
    .reduce((max, s) => Math.max(max, s.totalCount || 0), 0)

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar user={user} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{user?.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your contribution stats</p>
          </div>
        </div>
        {projectStats.length > 0 && (
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 w-full sm:w-auto font-medium"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {projectStats.length === 0 ? (
        <EmptyState message="You are not part of any projects yet" />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Contributions" value={totalContributions} />
            <StatCard label="Total Score" value={totalWeight} />
            <StatCard label="Projects Active" value={projectStats.length} />
            <StatCard label="Best Single Day" value={bestSingleDay} />
          </div>

          <Card className="mb-6 border-slate-800 bg-slate-900 shadow-xs">
            <CardHeader className="border-b border-slate-800 px-5 py-4">
              <CardTitle className="text-base font-semibold text-slate-100">Your Activity Over Time</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <PersonalAreaChart snapshots={allSnapshots} userId={user._id} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-800 bg-slate-900 shadow-xs">
              <CardHeader className="border-b border-slate-800 px-5 py-4">
                <CardTitle className="text-base font-semibold text-slate-100">By Project</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">Project</TableHead>
                        <TableHead className="text-slate-400">Contributions</TableHead>
                        <TableHead className="text-slate-400">Score</TableHead>
                        <TableHead className="text-slate-400">Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectStats.map(({ project, userEntry, rank }) => (
                        <TableRow key={project._id} className="border-slate-800/60">
                          <TableCell className="font-medium text-slate-100">{project.name}</TableCell>
                          <TableCell className="text-slate-400">{userEntry?.totalCount || 0}</TableCell>
                          <TableCell className="text-slate-400">{userEntry?.totalWeight || 0}</TableCell>
                          <TableCell className="text-slate-400">{rank || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900 shadow-xs">
              <CardHeader className="border-b border-slate-800 px-5 py-4">
                <CardTitle className="text-base font-semibold text-slate-100">What You Contribute</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <ContribTypeDonut breakdown={allBreakdowns} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </Layout>
  )
}

export default MyStats
