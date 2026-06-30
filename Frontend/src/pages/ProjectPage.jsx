import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Activity } from 'lucide-react'
import { getProjectById } from '../api/projects'
import { getContributions, logContribution } from '../api/contributions'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import Layout from '../components/layout/Layout'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'
import UserAvatar from '../components/ui/UserAvatar'
import ContribBadge from '../components/ui/ContribBadge'
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

const enrichContribution = (contribution, project, currentUser) => {
  if (contribution.user?.name) return contribution
  const userId = contribution.user?._id || contribution.user
  const member = project?.members?.find((m) => m.user._id === userId)
  if (member) return { ...contribution, user: member.user }
  if (userId === currentUser?._id) return { ...contribution, user: currentUser }
  return contribution
}

const ProjectPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const socket = useSocket()
  const [project, setProject] = useState(null)
  const [contributions, setContributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [type, setType] = useState('commit')
  const [meta, setMeta] = useState('')

  useEffect(() => {
    Promise.all([getProjectById(id), getContributions(id)])
      .then(([projectRes, contributionsRes]) => {
        setProject(projectRes.data)
        setContributions(contributionsRes.data)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!socket || !id) return
    socket.emit('join_project', id)
    const handleNewContribution = (contribution) => {
      setContributions((prev) => {
        if (prev.some((c) => c._id === contribution._id)) return prev
        return [enrichContribution(contribution, project, user), ...prev]
      })
    }
    socket.on('new_contribution', handleNewContribution)
    return () => {
      socket.emit('leave_project', id)
      socket.off('new_contribution', handleNewContribution)
    }
  }, [socket, id, project, user])

  const role = project?.members?.find((m) => m.user._id === user?._id)?.role

  const handleSubmit = (e) => {
    e.preventDefault()
    logContribution({ projectId: id, type, meta: meta || undefined })
      .then((res) => {
        const enriched = enrichContribution(res.data, project, user)
        setContributions((prev) => {
          if (prev.some((c) => c._id === enriched._id)) return prev
          return [enriched, ...prev]
        })
        setMeta('')
        setDialogOpen(false)
      })
      .catch((err) => console.error(err))
  }

  if (loading) return <Loader />

  return (
    <Layout>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card className="border-[#e8e8ef] bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#e8e8ef] px-5 py-4">
              <CardTitle className="text-base font-semibold text-[#1a1a2e]">
                Activity Feed
              </CardTitle>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-[#4f46e5] hover:bg-[#4338ca]"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Log Contribution
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {contributions.length === 0 ? (
                <EmptyState
                  message="No contributions yet"
                  icon={<Activity className="h-6 w-6" />}
                  action={{ label: 'Log Contribution', onClick: () => setDialogOpen(true) }}
                />
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  {contributions.map((contribution) => (
                    <div
                      key={contribution._id}
                      className="flex items-start gap-3 border-b border-[#f0f0f5] px-5 py-4 hover:bg-[#f8f8fb]"
                    >
                      <UserAvatar user={contribution.user} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#1a1a2e]">
                            {contribution.user?.name}
                          </span>
                          <ContribBadge type={contribution.type} />
                          <span className="ml-auto text-xs text-[#9ca3af]">
                            {new Date(contribution.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {contribution.meta && (
                          <p className="mt-0.5 text-sm text-[#6b7280]">{contribution.meta}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-[#e8e8ef] bg-white shadow-sm">
            <CardContent className="p-5">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">{project.name}</h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                {project.description || 'No description'}
              </p>
              <Separator className="my-4 bg-[#e8e8ef]" />
              <p className="mb-3 text-sm font-semibold text-[#1a1a2e]">Members</p>
              <ul className="space-y-2">
                {project.members.map((member) => (
                  <li key={member.user._id} className="flex items-center gap-3 py-2">
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
                  </li>
                ))}
              </ul>
              {role === 'admin' && (
                <Button
                  variant="ghost"
                  className="mt-4 w-full"
                  onClick={() => navigate(`/admin/projects/${id}`)}
                >
                  Manage Project
                </Button>
              )}
            </CardContent>
          </Card>
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
                  {CONTRIBUTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
