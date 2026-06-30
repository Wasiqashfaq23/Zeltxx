import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FolderKanban } from 'lucide-react'
import { getProjects, createProject } from '../api/projects'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'
import StatCard from '../components/ui/StatCard'
import { MemberAvatarStack } from '../components/ui/UserAvatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    getProjects()
      .then((res) => setProjects(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const getUserRole = (project) =>
    project.members.find((m) => (m.user._id || m.user) === user._id)?.role

  const handleCreate = (e) => {
    e.preventDefault()
    createProject({ name, description })
      .then((res) => {
        setProjects((prev) => [...prev, res.data])
        setName('')
        setDescription('')
        setDialogOpen(false)
      })
      .catch((err) => console.error(err))
  }

  const adminCount = projects.filter((p) => getUserRole(p) === 'admin').length
  const collabCount = projects.filter((p) => getUserRole(p) === 'collaborator').length
  const totalMembers = projects.reduce((sum, p) => sum + p.members.length, 0)

  if (loading) return <Loader />

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Welcome back, {user?.name}</p>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={projects.length} />
        <StatCard label="As Admin" value={adminCount} />
        <StatCard label="As Collaborator" value={collabCount} />
        <StatCard label="Total Members" value={totalMembers} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1a1a2e]">My Projects</h2>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#4f46e5] hover:bg-[#4338ca]"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          message="No projects yet. Create your first project to get started."
          icon={<FolderKanban className="h-6 w-6" />}
          action={{ label: 'Create Project', onClick: () => setDialogOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.map((project) => {
            const role = getUserRole(project)
            return (
              <Card
                key={project._id}
                className="flex flex-col border-[#e8e8ef] bg-white p-5 shadow-sm transition-all hover:border-[#4f46e5] hover:shadow-md"
              >
                <Link to={`/projects/${project._id}`} className="flex flex-1 flex-col">
                  <CardContent className="flex flex-1 flex-col p-0">
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-semibold text-[#1a1a2e]">{project.name}</h3>
                      <Badge
                        variant="secondary"
                        className={
                          role === 'admin'
                            ? 'bg-[#ede9fe] text-[#4f46e5]'
                            : 'bg-[#f4f4f7] text-[#6b7280]'
                        }
                      >
                        {role}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 flex-1 text-sm text-[#6b7280]">
                      {project.description || 'No description'}
                    </p>
                    <div className="mt-4 flex items-center border-t border-[#e8e8ef] pt-3">
                      <MemberAvatarStack members={project.members} />
                      <span className="ml-2 text-xs text-[#9ca3af]">
                        {project.members.length} members
                      </span>
                    </div>
                  </CardContent>
                </Link>
                <div className="mt-3 flex gap-2 px-5 pb-5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/projects/${project._id}`)}
                  >
                    View
                  </Button>
                  {role === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/admin/projects/${project._id}`)}
                    >
                      Manage
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-[#e8e8ef] bg-white">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Add a new project to your workspace</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 border-[#e8e8ef]"
              />
            </div>
            <div>
              <Label htmlFor="project-desc">Description</Label>
              <Input
                id="project-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 border-[#e8e8ef]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#4f46e5] hover:bg-[#4338ca]">
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default Dashboard
