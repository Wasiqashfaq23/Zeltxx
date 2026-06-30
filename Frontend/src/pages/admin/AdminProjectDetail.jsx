import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { UserPlus, UserMinus } from 'lucide-react'
import {
  getProjectById,
  updateProject,
  deleteProject,
  inviteMember,
  removeMember
} from '../../api/projects'
import { getProjectSummary } from '../../api/contributions'
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
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteRole, setInviteRole] = useState('collaborator')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      getProjectById(id),
      getProjectSummary(id),
      getSnapshotsByRange(id, daysAgo(14), new Date().toISOString().split('T')[0])
    ])
      .then(([projectRes, summaryRes, snapshotsRes]) => {
        setProject(projectRes.data)
        setSummary(summaryRes.data)
        setSnapshots(snapshotsRes.data)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [id])

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

  const handleRemove = (userId) => {
    removeMember(id, userId)
      .then(() => refreshProject())
      .catch((err) => console.error(err))
  }

  const handleInvite = (e) => {
    e.preventDefault()
    inviteMember(id, { userId: inviteUserId, role: inviteRole })
      .then(() => {
        setInviteUserId('')
        setInviteOpen(false)
        return refreshProject()
      })
      .catch((err) => console.error(err))
  }

  const handleDelete = () => {
    deleteProject(id)
      .then(() => navigate('/admin/projects'))
      .catch((err) => console.error(err))
  }

  if (loading) return <Loader />
  if (project && role !== 'admin') return <Navigate to="/unauthorized" replace />

  const totalWeight = summary.reduce((sum, entry) => sum + entry.totalWeight, 0)
  const rankedSummary = [...summary].sort((a, b) => b.totalWeight - a.totalWeight)
  const combinedBreakdown = summary.reduce((acc, entry) => acc.concat(entry.breakdown || []), [])

  return (
    <Layout>
      <Card className="mb-6 border-[#e8e8ef] bg-white shadow-sm">
        <CardContent className="flex items-start justify-between p-5">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">{project.name}</h1>
            <p className="mt-1 text-[#6b7280]">{project.description || 'No description'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(true)}>Edit</Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-6">
        <Card className="border-[#e8e8ef] bg-white shadow-sm">
          <CardHeader className="border-b border-[#e8e8ef] px-5 py-4">
            <CardTitle className="text-base font-semibold">Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rankedSummary.length === 0 ? (
              <EmptyState message="No contributions yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#e8e8ef] hover:bg-transparent">
                    <TableHead className="text-[#6b7280]">Rank</TableHead>
                    <TableHead className="text-[#6b7280]">Member</TableHead>
                    <TableHead className="text-[#6b7280]">Contributions</TableHead>
                    <TableHead className="text-[#6b7280]">Score</TableHead>
                    <TableHead className="text-[#6b7280]">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankedSummary.map((entry, index) => {
                    const share =
                      totalWeight > 0
                        ? ((entry.totalWeight / totalWeight) * 100).toFixed(1)
                        : 0
                    return (
                      <TableRow key={entry._id} className="border-[#f0f0f5]">
                        <TableCell
                          className={`font-bold ${index < 2 ? 'text-[#4f46e5]' : 'text-[#1a1a2e]'}`}
                        >
                          #{index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserAvatar user={entry.user} size="xs" />
                            <span className="font-medium">{entry.user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#6b7280]">{entry.totalCount}</TableCell>
                        <TableCell className="text-[#6b7280]">{entry.totalWeight}</TableCell>
                        <TableCell className="text-[#6b7280]">{share}%</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#e8e8ef] bg-white shadow-sm">
          <CardHeader className="border-b border-[#e8e8ef] px-5 py-4">
            <CardTitle className="text-base font-semibold">Contribution Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <ContribTypeDonut breakdown={combinedBreakdown} />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-[#e8e8ef] bg-white shadow-sm">
        <CardHeader className="border-b border-[#e8e8ef] px-5 py-4">
          <CardTitle className="text-base font-semibold">14 Day Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <ActivityLineChart snapshots={snapshots} members={project?.members || []} />
        </CardContent>
      </Card>

      <Card className="mb-6 border-[#e8e8ef] bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#e8e8ef] px-5 py-4">
          <CardTitle className="text-base font-semibold">Members</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {project.members.length === 0 ? (
            <EmptyState message="No members yet" />
          ) : (
            project.members.map((member) => (
              <div
                key={member.user._id}
                className="flex items-center gap-3 border-b border-[#f0f0f5] px-5 py-3 last:border-0"
              >
                <UserAvatar user={member.user} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1a1a2e]">{member.user.name}</p>
                  <p className="text-xs text-[#9ca3af]">{member.user.email}</p>
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(member.user._id)}
                  className="hover:text-[#dc2626]"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
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

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="border-[#e8e8ef] bg-white">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <Label htmlFor="invite-id">User ID</Label>
              <Input
                id="invite-id"
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
                required
                className="mt-1 border-[#e8e8ef]"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1 w-full border-[#e8e8ef]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collaborator">collaborator</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#4f46e5] hover:bg-[#4338ca]">Invite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default AdminProjectDetail
