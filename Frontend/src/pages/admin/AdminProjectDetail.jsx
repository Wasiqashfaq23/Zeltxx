import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { UserPlus, UserMinus, Download, ArrowLeft, KeyRound, Copy, Loader2 } from 'lucide-react'
import {
  getProjectById,
  updateProject,
  deleteProject,
  inviteMember,
  removeMember,
  generateWebhookSecret,
  updateWebhookEvents
} from '../../api/projects'
import { getProjectSummary, getProjectStreaks } from '../../api/contributions'
import { getSnapshotsByRange } from '../../api/snapshots'
import { useAuth } from '../../context/AuthContext'
import Layout from '../../components/layout/Layout'
import Loader from '../../components/ui/Loader'
import EmptyState from '../../components/ui/EmptyState'
import UserAvatar from '../../components/ui/UserAvatar'
import ContributionBarChart from '../../components/charts/ContributionBarChart'
import ActivityLineChart from '../../components/charts/ActivityLineChart'
import ContribTypeDonut from '../../components/charts/ContribTypeDonut'
import { daysAgo } from '../../utils/chartHelpers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

const AdminProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState([])
  const [summaryRange, setSummaryRange] = useState('all')
  const [streaks, setStreaks] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('collaborator')
  const [inviteError, setInviteError] = useState('')
  const [pageMessage, setPageMessage] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState(null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [webhookSecret, setWebhookSecret] = useState('')
  const [webhookMsg, setWebhookMsg] = useState('')
  const [webhookEvents, setWebhookEvents] = useState(['push', 'pr', 'issues', 'review'])
  const [generatingSecret, setGeneratingSecret] = useState(false)

  const WEBHOOK_EVENT_OPTIONS = [
    { id: 'push', label: 'Push / Commits' },
    { id: 'pr', label: 'Pull Requests' },
    { id: 'issues', label: 'Issues' },
    { id: 'review', label: 'Reviews' }
  ]

  const handleToggleWebhookEvent = (id, disabled) => {
    if (disabled) return
    const next = webhookEvents.includes(id)
      ? webhookEvents.filter((e) => e !== id)
      : [...webhookEvents, id]
    setWebhookEvents(next)
    updateWebhookEvents(id, { events: next })
      .then(() => {
        setPageMessage('Webhook event tracking updated.')
      })
      .catch((err) => {
        setWebhookEvents(webhookEvents)
        alert(err.response?.data?.message || 'Failed to update webhook events')
      })
  }

  const handlePromptRemove = (memberUser) => {
    setMemberToRemove(memberUser)
    setRemoveDialogOpen(true)
  }

  const confirmRemoveMember = () => {
    if (!memberToRemove) return
    const memberId = memberToRemove._id || memberToRemove
    removeMember(id, memberId)
      .then(() => {
        refreshProject()
        setRemoveDialogOpen(false)
        setMemberToRemove(null)
      })
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    Promise.all([
      getProjectById(id),
      getProjectSummary(id, 'all'),
      getProjectStreaks(id),
      getSnapshotsByRange(id, daysAgo(30), new Date().toISOString().split('T')[0])
    ])
      .then(([projectRes, summaryRes, streaksRes, snapshotsRes]) => {
        setProject(projectRes.data)
        setWebhookEvents(projectRes.data?.webhookEvents?.length ? projectRes.data.webhookEvents : ['push', 'pr', 'issues', 'review'])
        setSummary(summaryRes.data)
        setStreaks(streaksRes.data)
        setSnapshots(snapshotsRes.data)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (summaryRange === 'all') return
    getProjectSummary(id, summaryRange)
      .then((res) => setSummary(res.data))
      .catch((err) => console.error(err))
  }, [id, summaryRange])

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description)
    }
  }, [project])

  const role = project?.members?.find((m) => m.user._id === user?._id)?.role

  const refreshProject = () =>
    getProjectById(id)
      .then((res) => setProject(res.data))
      .catch((err) => console.error(err))

  const handleSave = (e) => {
    e.preventDefault()
    updateProject(id, { name, description })
      .then((res) => {
        setProject(res.data)
        setEditOpen(false)
      })
      .catch((err) => console.error(err))
  }

  const handleGenerateWebhookSecret = () => {
    setWebhookMsg('')
    setGeneratingSecret(true)
    generateWebhookSecret(id)
      .then((res) => {
        setWebhookSecret(res.data?.webhookSecret || '')
        setWebhookMsg('New secret generated. Copy it now — it is shown only once.')
      })
      .catch((err) => setWebhookMsg(err.response?.data?.message || 'Failed to generate secret'))
      .finally(() => setGeneratingSecret(false))
  }

  const handleCopyWebhookSecret = () => {
    if (!webhookSecret) return
    navigator.clipboard.writeText(webhookSecret)
    setWebhookMsg('Secret copied to clipboard.')
  }

  const handleInvite = async () => {
    setPageMessage('')
    setInviteError('')
    try {
      const res = await inviteMember(id, { email: inviteEmail, role: inviteRole })
      if (res.data.members) {
        setProject(res.data)
      } else {
        setPageMessage(res.data.message)
      }
      setInviteEmail('')
      setInviteRole('collaborator')
      setInviteOpen(false)
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to send invite')
    }
  }

  const handleDelete = () => {
    deleteProject(id)
      .then(() => navigate('/admin/projects'))
      .catch((err) => console.error(err))
  }

  if (loading) return <Loader />
  if (!project) {
    return (
      <Layout>
        <EmptyState
          message="Project not found or you do not have permission to access this project admin view."
          action={{ label: 'Back to Dashboard', onClick: () => navigate('/dashboard') }}
        />
      </Layout>
    )
  }
  if (role !== 'admin') return <Navigate to="/unauthorized" replace />

  const totalWeight = summary.reduce((sum, entry) => sum + entry.totalWeight, 0)
  const rankedSummary = [...summary].sort((a, b) => b.totalWeight - a.totalWeight)
  const combinedBreakdown = summary.reduce((acc, entry) => acc.concat(entry.breakdown || []), [])
  const streakMap = streaks.reduce((acc, s) => {
    if (s.user && s.user._id) acc[String(s.user._id)] = s
    return acc
  }, {})

  const handleExportLeaderboardCSV = () => {
    if (!rankedSummary.length) return
    const headers = ['Rank', 'Member Name', 'Member Email', 'Contributions', 'Score', 'Share %']
    const rows = rankedSummary.map((entry, index) => {
      const share = totalWeight > 0 ? ((entry.totalWeight / totalWeight) * 100).toFixed(1) : 0
      return [
        index + 1,
        `"${(entry.user?.name || '').replace(/"/g, '""')}"`,
        `"${(entry.user?.email || '').replace(/"/g, '""')}"`,
        entry.totalCount,
        entry.totalWeight,
        `${share}%`
      ]
    })
    const csvStr = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${(project.name || 'project').replace(/\s+/g, '_')}_leaderboard.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Layout>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/projects')}
          className="text-[#6b7280] hover:text-[#1a1a2e] dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
      </div>
      {pageMessage && (
        <div className="mb-4 rounded-lg border border-[#e8e8ef] bg-[#ede9fe] px-4 py-3 text-sm text-[#4f46e5]">
          {pageMessage}
          <button
            type="button"
            onClick={() => setPageMessage('')}
            className="ml-3 text-[#4338ca] underline"
          >
            Dismiss
          </button>
        </div>
      )}
      <Card className="mb-6 border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{project.name}</h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">{project.description || 'No description'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(`/projects/${project._id}`)}>
              Open Workspace (Kanban & Chat)
            </Button>
            <Button variant="ghost" onClick={() => setEditOpen(true)} className="text-slate-700 dark:text-slate-300">Edit</Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">Leaderboard</CardTitle>
              <div className="flex items-center rounded-lg border border-slate-200 p-0.5 dark:border-slate-800">
                {[['30', 'Month'], ['7', 'Week'], ['all', 'All-time']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSummaryRange(val)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      summaryRange === val
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {rankedSummary.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleExportLeaderboardCSV}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {rankedSummary.length === 0 ? (
              <EmptyState message="No contributions yet" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-transparent dark:border-slate-800">
                      <TableHead className="text-slate-500 dark:text-slate-400">Rank</TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400">Member</TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400">Contributions</TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400">Score</TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400">Share</TableHead>
                      <TableHead className="text-slate-500 dark:text-slate-400">Streak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankedSummary.map((entry, index) => {
                      const share =
                        totalWeight > 0
                          ? ((entry.totalWeight / totalWeight) * 100).toFixed(1)
                          : 0
                      return (
                        <TableRow key={entry._id} className="border-slate-100 dark:border-slate-800/60">
                          <TableCell
                            className={`font-bold ${index < 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}
                          >
                            #{index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserAvatar user={entry.user} size="xs" />
                              <span className="font-medium text-slate-900 dark:text-slate-100">{entry.user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400">{entry.totalCount}</TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400">{entry.totalWeight}</TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400">{share}%</TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400">
                            {(() => {
                              const streak = streakMap[String(entry.user._id)]
                              return streak && streak.current > 0 ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-orange-50 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300"
                                >
                                  {streak.current}d
                                </Badge>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )
                            })()}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">Contribution Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <ContribTypeDonut breakdown={combinedBreakdown} />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">14 Day Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <ActivityLineChart snapshots={snapshots} members={project?.members || []} />
        </CardContent>
      </Card>

      <Card className="mb-6 border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">Members</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInviteOpen(true)}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {project.members.length === 0 ? (
            <EmptyState message="No members yet" />
          ) : (
            project.members.map((member) => {
              const memberUserId = member.user._id || member.user
              const isCurrentLoggedInUser = memberUserId === user?._id

              return (
                <div
                  key={memberUserId}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-3 border-b border-slate-100 dark:border-slate-800/60 px-4 sm:px-5 py-3 last:border-0"
                >
                  <UserAvatar user={member.user} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{member.user.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{member.user.email}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      member.role === 'admin'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }
                  >
                    {member.role}
                  </Badge>

                  {!isCurrentLoggedInUser && member.role !== 'admin' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePromptRemove(member.user)}
                      className="hover:text-red-500 text-slate-400 ml-auto sm:ml-0"
                      aria-label={`Remove ${member.user.name} from project`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 border-[#e8e8ef] bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#e8e8ef] px-5 py-4">
          <CardTitle className="text-base font-semibold">Webhook Setup</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateWebhookSecret}
            disabled={generatingSecret}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {generatingSecret ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {webhookSecret ? 'Regenerate Secret' : 'Generate Secret'}
          </Button>
        </CardHeader>
        <CardContent className="p-5">
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            GitHub webhooks require an HMAC secret. After generating, use this secret to sign requests from your GitHub repo and verify them with the simulator.
          </p>
          {webhookSecret && (
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 min-w-0 truncate rounded-lg border border-[#e8e8ef] bg-[#f9f9fb] px-3 py-2 text-sm font-mono text-[#1a1a2e] break-all">
                {webhookSecret}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopyWebhookSecret}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          )}
          {webhookMsg && <p className="mt-2 text-xs text-[#4f46e5]">{webhookMsg}</p>}
          <div className="mt-4 border-t border-[#e8e8ef] pt-4 dark:border-slate-800">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Track these webhook events
            </p>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENT_OPTIONS.map((opt) => {
                const enabled = webhookEvents.includes(opt.id)
                const onlyOneEnabled = enabled && webhookEvents.length === 1
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={onlyOneEnabled}
                    onClick={() => handleToggleWebhookEvent(project._id, onlyOneEnabled)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      enabled
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                        : 'border-[#e8e8ef] bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                    title={onlyOneEnabled ? 'At least one event category must stay enabled' : undefined}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Disabled categories are received but not recorded as contributions.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#e8e8ef] bg-white shadow-sm">
        <CardHeader className="border-b border-[#e8e8ef] px-5 py-4">
          <CardTitle className="text-base font-semibold">Contributions by Member</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <ContributionBarChart summary={summary} />
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-[#e8e8ef] bg-white">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 border-[#e8e8ef]"
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 border-[#e8e8ef]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#4f46e5] hover:bg-[#4338ca]">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-[#e8e8ef] bg-white">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={(open) => {
        setInviteOpen(open)
        if (!open) {
          setInviteError('')
        }
      }}>
        <DialogContent className="border-[#e8e8ef] bg-white">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Invite someone by email. If they don't have a Zeltxx account yet, an invitation will be sent to them.
            </DialogDescription>
          </DialogHeader>
          {inviteError && (
            <p className="text-sm text-[#dc2626]">{inviteError}</p>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1 border-[#e8e8ef]"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role" className="mt-1 w-full border-[#e8e8ef]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collaborator">Collaborator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail} className="bg-[#4f46e5] hover:bg-[#4338ca]">
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Modal */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2 text-base font-semibold">
              <UserMinus className="h-5 w-5" />
              Remove Collaborator
            </DialogTitle>
            <DialogDescription className="text-slate-300 pt-2 text-sm">
              Are you sure you want to remove <strong className="text-slate-100">{memberToRemove?.name}</strong> ({memberToRemove?.email}) from <strong className="text-slate-100">{project?.name}</strong>?
              They will immediately lose access to this project workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white font-medium ml-2"
              onClick={confirmRemoveMember}
            >
              Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default AdminProjectDetail
