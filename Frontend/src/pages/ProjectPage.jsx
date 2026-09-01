import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Activity, Search, Columns3, MessageSquare, FileText, FolderGit2, Calendar as CalendarIcon, GitBranch, FileDown, ArrowLeft, Loader2, Activity as ActivityIcon } from 'lucide-react'
import { getProjectById, inviteMember, getProjectActivity } from '../api/projects'
import { getContributions, logContribution, toggleReaction, exportContributionsCsv } from '../api/contributions'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import Layout from '../components/layout/Layout'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'
import UserAvatar from '../components/ui/UserAvatar'
import ContribBadge from '../components/ui/ContribBadge'
import KanbanBoard from '../components/project/KanbanBoard'
import LiveChat from '../components/project/LiveChat'
import CollaborativeNotes from '../components/project/CollaborativeNotes'
import ResourceManager from '../components/project/ResourceManager'
import ProjectCalendar from '../components/project/ProjectCalendar'
import WebhookSimulator from '../components/project/WebhookSimulator'
import ContribHeatmap from '../components/charts/ContribHeatmap'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

const CONTRIBUTION_TYPES = ['commit', 'comment', 'task_complete', 'file_upload', 'review']
// Types a member may log manually — everything else is recorded automatically
// by its server-side trigger (git sync, webhook, task completion, resources).
const MANUAL_TYPES = ['comment', 'review']
const EMOJIS = ['👍', '❤️', '🚀', '🔥', '👏']
const PAGE_SIZE = 50

const describeMeta = (meta) => {
  if (!meta) return null
  if (typeof meta === 'string') return meta
  if (meta.commitMsg) return `[${meta.sha || 'commit'}] ${meta.commitMsg}`
  if (meta.note) return meta.note
  if (meta.title) return `[task] ${meta.title}`
  if (meta.url) return 'Related link'
  return null
}

const enrichContribution = (contribution, project, currentUser) => {
  if (contribution.user?.name) return contribution
  const userId = contribution.user?._id || contribution.user
  const member = project?.members?.find((m) => String(m.user._id) === String(userId))
  if (member) return { ...contribution, user: member.user }
  if (String(userId) === String(currentUser?._id)) return { ...contribution, user: currentUser }
  return contribution
}

const ProjectPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const socket = useSocket()
  const [project, setProject] = useState(null)
  const [contributions, setContributions] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [type, setType] = useState('comment')
  const [meta, setMeta] = useState('')
  const [searchFeed, setSearchFeed] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('feed')
  const projectRef = useRef(project)
  projectRef.current = project

  useEffect(() => {
    Promise.all([getProjectById(id), getContributions(id, { limit: PAGE_SIZE, offset: 0 }), getProjectActivity(id, 50)])
      .then(([projectRes, contributionsRes, activityRes]) => {
        setProject(projectRes.data)
        setContributions(contributionsRes.data.contributions || [])
        setHasMore(!!contributionsRes.data.hasMore)
        setActivities(activityRes.data || [])
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!socket || !id || !user) return
    socket.emit('join_project', { projectId: id })

    const handleNewContribution = (contribution) => {
      setContributions((prev) => {
        if (prev.some((c) => c._id === contribution._id)) return prev
        return [enrichContribution(contribution, projectRef.current, user), ...prev]
      })
    }

    const handleUpdatedContribution = (updated) => {
      setContributions((prev) =>
        prev.map((c) => (c._id === updated._id ? enrichContribution(updated, projectRef.current, user) : c))
      )
    }

    const handlePresence = (users) => {
      setOnlineUsers(users)
    }

    const handleActivity = (activity) => {
      setActivities((prev) => [activity, ...prev.filter((a) => a._id !== activity._id)].slice(0, 100))
    }

    socket.on('new_contribution', handleNewContribution)
    socket.on('contribution_updated', handleUpdatedContribution)
    socket.on('presence_update', handlePresence)
    socket.on('activity_logged', handleActivity)

    return () => {
      socket.emit('leave_project', id)
      socket.off('new_contribution', handleNewContribution)
      socket.off('contribution_updated', handleUpdatedContribution)
      socket.off('presence_update', handlePresence)
      socket.off('activity_logged', handleActivity)
    }
  }, [socket, id, user])

  const role = project?.members?.find((m) => m.user._id === user?._id)?.role

  const handleSubmit = (e) => {
    e.preventDefault()
    logContribution({ projectId: id, type, meta })
      .then((res) => {
        const enriched = enrichContribution(res.data, projectRef.current, user)
        setContributions((prev) => {
          if (prev.some((c) => c._id === enriched._id)) return prev
          return [enriched, ...prev]
        })
        setMeta('')
        setDialogOpen(false)
      })
      .catch((err) => alert(err.response?.data?.message || 'Failed to log contribution'))
  }

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    getContributions(id, { limit: PAGE_SIZE, offset: contributions.length })
      .then((res) => {
        const page = res.data.contributions || []
        setContributions((prev) => {
          const merged = [...prev]
          for (const c of page) {
            if (!merged.some((x) => x._id === c._id)) merged.push(c)
          }
          return merged
        })
        setHasMore(!!res.data.hasMore)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingMore(false))
  }

  const handleReact = (contribId, emoji) => {
    toggleReaction(contribId, emoji)
      .then((res) => {
        setContributions((prev) =>
          prev.map((c) => (c._id === res.data._id ? enrichContribution(res.data, project, user) : c))
        )
      })
      .catch((err) => console.error(err))
  }

  const handleQuickInvite = (email) => {
    if (!email) return
    inviteMember(id, { email, role: 'collaborator' })
      .then(() => {
        alert(`Invitation sent to ${email}! Email notification dispatched.`)
      })
      .catch((err) => {
        alert(err.response?.data?.message || 'Failed to send invite')
      })
  }

  const handleExportMarkdownReport = () => {
    if (!project) return
    const lines = [
      `# Project Summary Report: ${project.name}`,
      `**Description**: ${project.description || 'N/A'}`,
      `**Role**: ${role}`,
      `**Total Contributions**: ${contributions.length}`,
      `**Export Date**: ${new Date().toLocaleDateString()}`,
      `\n## Team Members (${project.members.length})`,
      ...project.members.map((m) => `- ${m.user.name} (${m.user.email}) - ${m.role}`),
      `\n## Activity History`,
      ...contributions.map((c) => `- [${c.type.toUpperCase()}] ${c.user?.name || 'Member'}: ${describeMeta(c.meta) || 'No details'} (${new Date(c.createdAt).toLocaleDateString()})`),
      `\n## Shared Project Notes`,
      project.notes || 'No shared notes recorded.'
    ]
    const mdContent = lines.join('\n')
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${(project.name || 'project').replace(/\s+/g, '_')}_summary.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportCsv = async () => {
    try {
      const res = await exportContributionsCsv(id)
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${(project?.name || 'project').replace(/\s+/g, '_')}_contributions.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export CSV')
    }
  }

  const filteredContributions = contributions.filter((c) => {
    const matchesType = typeFilter === 'all' || c.type === typeFilter
    const search = searchFeed.toLowerCase()
    const metaSearch = typeof c.meta === 'string' ? c.meta.toLowerCase() : JSON.stringify(c.meta || '').toLowerCase()
    const matchesSearch =
      !searchFeed ||
      (c.user?.name && c.user.name.toLowerCase().includes(search)) ||
      metaSearch.includes(search)
    return matchesType && matchesSearch
  })

  if (loading) return <Loader />
  if (!project) {
    return (
      <Layout>
        <EmptyState
          message="Project not found or you do not have permission to view this project workspace."
          action={{ label: 'Back to Dashboard', onClick: () => navigate('/dashboard') }}
        />
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Friendly Back Navigation */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="text-[#6b7280] hover:text-[#1a1a2e] dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Top Banner with Presence Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{project.name}</h1>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-semibold capitalize">
              {role}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {project.description || 'No description provided'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onlineUsers.length > 0 && (
            <div className="flex items-center -space-x-2" title="Team members online right now">
              {onlineUsers
                .filter((u) => String(u._id) !== String(user?._id))
                .slice(0, 6)
                .map((u) => (
                  <UserAvatar
                    key={u._id}
                    user={u}
                    size="xs"
                    className="ring-2 ring-white dark:ring-slate-900"
                  />
                ))}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-800 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{onlineUsers.length > 0 ? `${onlineUsers.length} Online Now` : '1 Online'}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMarkdownReport}
            className="border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 font-medium"
          >
            <FileDown className="h-4 w-4" />
            Export Summary (.md)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 font-medium"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>

          {role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/projects/${id}`)}
              className="border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 font-medium"
            >
              Manage Settings
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Header */}
      <div className="mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <Button
          variant={activeTab === 'feed' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('feed')}
          className={
            activeTab === 'feed'
              ? 'bg-blue-600 text-white hover:bg-blue-700 font-medium'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }
        >
          <Activity className="h-4 w-4" />
          Activity Feed
        </Button>
        <Button
          variant={activeTab === 'kanban' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('kanban')}
          className={
            activeTab === 'kanban'
              ? 'bg-blue-600 text-white hover:bg-blue-700 font-medium'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }
        >
          <Columns3 className="h-4 w-4" />
          Task Board
        </Button>
        <Button
          variant={activeTab === 'calendar' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('calendar')}
          className={
            activeTab === 'calendar'
              ? 'bg-blue-600 text-white hover:bg-blue-700 font-medium'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }
        >
          <CalendarIcon className="h-4 w-4" />
          Schedule & Deadlines
        </Button>
        <Button
          variant={activeTab === 'chat' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('chat')}
          className={
            activeTab === 'chat'
              ? 'bg-blue-600 text-white hover:bg-blue-700 font-medium'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }
        >
          <MessageSquare className="h-4 w-4" />
          Team Chat
        </Button>
        <Button
          variant={activeTab === 'notes' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('notes')}
          className={
            activeTab === 'notes'
              ? 'bg-blue-600 text-white hover:bg-blue-700 font-medium'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }
        >
          <FileText className="h-4 w-4" />
          Team Notes
        </Button>
        <Button
          variant={activeTab === 'resources' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('resources')}
          className={
            activeTab === 'resources'
              ? 'bg-blue-600 text-white hover:bg-blue-700 font-medium'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }
        >
          <FolderGit2 className="h-4 w-4" />
          Docs & Links
        </Button>
        <Button
          variant={activeTab === 'webhook' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('webhook')}
          className={
            activeTab === 'webhook'
              ? 'bg-blue-600 text-white hover:bg-blue-700 font-medium'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }
        >
          <GitBranch className="h-4 w-4" />
          Automated Sync (GitHub)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'feed' && (
            <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-5 py-4 dark:border-slate-800">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Activity Feed
                </CardTitle>
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Log Contribution
                </Button>
              </CardHeader>
              <div className="p-4 border-b border-slate-200 bg-slate-50 dark:bg-slate-800/60 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search contributions..."
                    value={searchFeed}
                    onChange={(e) => setSearchFeed(e.target.value)}
                    className="pl-9 h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {['all', ...CONTRIBUTION_TYPES].map((t) => (
                    <Button
                      key={t}
                      variant={typeFilter === t ? 'default' : 'ghost'}
                      size="xs"
                      onClick={() => setTypeFilter(t)}
                      className={
                        typeFilter === t
                          ? 'bg-blue-600 text-white hover:bg-blue-700 text-[11px]'
                          : 'text-[#6b7280] hover:bg-[#f4f4f7] text-[11px] dark:text-slate-400 dark:hover:bg-slate-800'
                      }
                    >
                      {t.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
              <CardContent className="p-0">
                {filteredContributions.length === 0 ? (
                  <EmptyState
                    message={
                      contributions.length === 0
                        ? 'No contributions yet'
                        : 'No contributions match your filters'
                    }
                    icon={<Activity className="h-6 w-6" />}
                    action={
                      contributions.length === 0
                        ? { label: 'Log Contribution', onClick: () => setDialogOpen(true) }
                        : undefined
                    }
                  />
                ) : (
                  <div className="max-h-[600px] overflow-y-auto">
                    {filteredContributions.map((contribution) => (
                      <div
                        key={contribution._id}
                        className="flex items-start gap-3 border-b border-[#f0f0f5] px-3 sm:px-5 py-4 hover:bg-[#f8f8fb]"
                      >
                        <UserAvatar
                          user={
                            contribution.user || {
                              name: typeof contribution.meta === 'object' ? contribution.meta.authorName : 'External Committer',
                              email: typeof contribution.meta === 'object' ? contribution.meta.authorEmail : ''
                            }
                          }
                          size="sm"
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-100">
                              {contribution.user?.name || (typeof contribution.meta === 'object' ? contribution.meta.authorName : 'External Committer')}
                            </span>
                            {!contribution.user && (
                              <>
                                <span className="inline-flex items-center rounded-full bg-amber-950/80 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-800">
                                  Non-Member Committer
                                </span>
                                {typeof contribution.meta === 'object' && contribution.meta.authorEmail && (
                                  <span className="text-xs text-slate-400 font-mono">({contribution.meta.authorEmail})</span>
                                )}
                                {role === 'admin' && typeof contribution.meta === 'object' && contribution.meta.authorEmail && (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="h-5 px-2 text-[10px] border-blue-700 bg-blue-950 text-blue-300 hover:bg-blue-900"
                                    onClick={() => handleQuickInvite(contribution.meta.authorEmail)}
                                  >
                                    Invite to Project
                                  </Button>
                                )}
                              </>
                            )}
                            <ContribBadge type={contribution.type} />
                            <span className="text-xs text-slate-400 sm:ml-auto">
                              {new Date(contribution.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {contribution.meta && (
                            <p className="text-sm text-slate-300 break-words">
                              {typeof contribution.meta === 'object'
                                ? (describeMeta(contribution.meta) ||
                                  (Object.keys(contribution.meta).length ? JSON.stringify(contribution.meta) : null))
                                : contribution.meta}
                            </p>
                          )}

                          {/* Live Reaction Bar */}
                          <div className="flex items-center gap-1.5 pt-1">
                            {EMOJIS.map((emoji) => {
                              const reactions = contribution.reactions || []
                              const count = reactions.filter((r) => r.emoji === emoji).length
                              const reactedByMe = reactions.some(
                                (r) => (r.user?._id || r.user) === user?._id && r.emoji === emoji
                              )
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleReact(contribution._id, emoji)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border ${
                                    reactedByMe
                                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300'
                                      : 'bg-white border-[#e8e8ef] text-[#6b7280] hover:bg-[#f4f4f7] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  {count > 0 && <span>{count}</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    {hasMore && (
                      <div className="p-3 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="gap-2"
                        >
                          {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {loadingMore ? 'Loading...' : 'Load more'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'feed' && (
            <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="border-b border-slate-200 px-4 sm:px-5 py-4 dark:border-slate-800">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ActivityIcon className="h-4 w-4 text-[#4f46e5]" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {activities.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400">No activity yet</div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    {activities.slice(0, 30).map((a) => (
                      <div
                        key={a._id}
                        className="flex items-start gap-3 border-b border-[#f0f0f5] px-4 sm:px-5 py-3 last:border-0 dark:border-slate-800"
                      >
                        <UserAvatar user={a.actor || { name: a.actorName || '?' }} size="xs" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">
                            {a.message}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {new Date(a.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'kanban' && (
            <KanbanBoard projectId={id} members={project.members} isAdmin={role === 'admin'} currentUserId={user?._id} />
          )}

          {activeTab === 'calendar' && <ProjectCalendar projectId={id} />}

          {activeTab === 'chat' && <LiveChat projectId={id} />}

          {activeTab === 'notes' && (
            <CollaborativeNotes projectId={id} initialNotes={project.notes} />
          )}

          {activeTab === 'resources' && <ResourceManager projectId={id} />}

          {activeTab === 'webhook' && <WebhookSimulator projectId={id} />}
        </div>

        <div className="space-y-6">
          <Card className="border-[#e8e8ef] bg-white shadow-sm">
            <CardContent className="p-5">
              <h2 className="text-base font-semibold text-[#1a1a2e]">Members ({project.members.length})</h2>
              <Separator className="my-3 bg-[#e8e8ef]" />
              <ul className="space-y-2">
                {project.members.map((member) => {
                  const isOnline = onlineUsers.some((u) => u._id === member.user._id)
                  return (
                    <li key={member.user._id} className="flex items-center gap-3 py-1.5">
                      <div className="relative">
                        <UserAvatar user={member.user} size="sm" />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1a1a2e]">{member.user.name}</p>
                        <p className="text-xs text-[#9ca3af] truncate">{member.user.email}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          member.role === 'admin'
                            ? 'bg-[#ede9fe] text-[#4f46e5]'
                            : 'bg-[#f4f4f7] text-[#6b7280]'
                        }
                      >
                        {member.role}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          <ContribHeatmap contributions={contributions} />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-[#e8e8ef] bg-white">
          <DialogHeader>
            <DialogTitle>Log Contribution</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1 w-full border-[#e8e8ef]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-slate-400">
                Commits, task completions and file uploads are recorded automatically by the platform.
              </p>
            </div>
            <div>
              <Label htmlFor="contrib-message">Message</Label>
              <Input
                id="contrib-message"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                placeholder="Add a note..."
                className="mt-1 border-[#e8e8ef]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#4f46e5] hover:bg-[#4338ca]">
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default ProjectPage
