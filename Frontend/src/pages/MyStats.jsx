import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { getProjects } from '../api/projects'
import { getProjectSummary, getWorkspaceLeaderboard } from '../api/contributions'
import { getSnapshotsByRange } from '../api/snapshots'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'
import StatCard from '../components/ui/StatCard'
import UserAvatar from '../components/ui/UserAvatar'
import PersonalAreaChart from '../components/charts/PersonalAreaChart'
import ContribTypeDonut from '../components/charts/ContribTypeDonut'
import ContribHeatmap from '../components/charts/ContribHeatmap'
import { daysAgo } from '../utils/chartHelpers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardRange, setLeaderboardRange] = useState('all')

  useEffect(() => {
    getProjects()
      .then(async (res) => {
        const projects = res.data
        const stats = await Promise.all(
          projects.map(async (project) => {
            const summaryRes = await getProjectSummary(project._id)
            const snapshotsRes = await getSnapshotsByRange(
              project._id,
              daysAgo(30),
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

  useEffect(() => {
    if (!user) return
    getWorkspaceLeaderboard(leaderboardRange)
      .then((res) => setLeaderboard(res.data))
      .catch((err) => console.error(err))
  }, [user, leaderboardRange])

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
    .filter((s) => String(s.user._id) === String(user._id))
    .reduce((max, s) => Math.max(max, s.totalCount || 0), 0)

  const myActiveDays = [
    ...new Set(
      allSnapshots
        .filter((s) => String(s.user._id) === String(user._id))
        .map((s) => new Date(s.date).toISOString().slice(0, 10))
    )
  ].sort()

  const computeStreak = (days) => {
    if (!days.length) return { current: 0, longest: 0 }
    let longest = 1
    let run = 1
    for (let i = 1; i < days.length; i++) {
      if (Math.round((new Date(days[i]) - new Date(days[i - 1])) / 86400000) === 1) run += 1
      else run = 1
      if (run > longest) longest = run
    }
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const last = days[days.length - 1]
    let current = last === today || last === yesterday ? 1 : 0
    for (let i = days.length - 2; i >= 0 && current > 0; i--) {
      if (Math.round((new Date(days[i + 1]) - new Date(days[i])) / 86400000) === 1) current += 1
      else break
    }
    return { current, longest }
  }

  const { current: currentStreak, longest: longestStreak } = computeStreak(myActiveDays)

  const rankedLeaderboard = [...leaderboard].sort((a, b) => b.totalWeight - a.totalWeight)

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar user={user} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{user?.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your contribution stats</p>
            <p className="text-sm font-medium text-orange-500 dark:text-orange-400">
              {currentStreak > 0
                ? `${currentStreak}-day active streak (longest ${longestStreak})`
                : longestStreak > 0
                  ? `Longest streak: ${longestStreak} days`
                  : 'No contributions tracked yet'}
            </p>
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

          <div className="mb-6">
            <ContribHeatmap
              snapshots={allSnapshots.filter((s) => String(s.user._id) === String(user._id))}
            />
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

          <Card className="mt-6 border-slate-800 bg-slate-900 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <CardTitle className="text-base font-semibold text-slate-100">Workspace Leaderboard</CardTitle>
              <div className="flex items-center rounded-lg border border-slate-800 p-0.5">
                {[['30', 'Month'], ['7', 'Week'], ['all', 'All-time']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLeaderboardRange(val)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      leaderboardRange === val
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {rankedLeaderboard.length === 0 ? (
                <EmptyState message="No contributions across your projects yet" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">Rank</TableHead>
                        <TableHead className="text-slate-400">Member</TableHead>
                        <TableHead className="text-slate-400">Contributions</TableHead>
                        <TableHead className="text-slate-400">Score</TableHead>
                        <TableHead className="text-slate-400">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankedLeaderboard.map((entry, index) => {
                        const totalScore = rankedLeaderboard.reduce((sum, e) => sum + (e.totalWeight || 0), 0)
                        const share =
                          totalScore > 0 ? ((entry.totalWeight / totalScore) * 100).toFixed(1) : 0
                        const isMe = String(entry.user?._id) === String(user?._id)
                        return (
                          <TableRow
                            key={entry._id || index}
                            className={`border-slate-800/60 ${isMe ? 'bg-blue-950/40' : ''}`}
                          >
                            <TableCell className="font-bold text-slate-100">#{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <UserAvatar user={entry.user} size="xs" />
                                <span className="font-medium text-slate-100">
                                  {entry.user.name}
                                  {isMe && (
                                    <Badge className="ml-2 bg-blue-600 text-white">You</Badge>
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-400">{entry.totalCount}</TableCell>
                            <TableCell className="text-slate-400">{entry.totalWeight}</TableCell>
                            <TableCell className="text-slate-400">{share}%</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Layout>
  )
}

export default MyStats
