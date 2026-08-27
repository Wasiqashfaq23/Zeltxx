import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FolderKanban, Search } from 'lucide-react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    getProjects()
      .then((res) => setProjects(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const getUserRole = (project) =>
    project.members.find((m) => (m.user._id || m.user) === user?._id)?.role

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

  const filteredProjects = projects.filter((project) => {
    const role = getUserRole(project)
    const matchesRole = roleFilter === 'all' || role === roleFilter
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesRole && matchesSearch
  })

  if (loading) return <Loader />

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Welcome back, {user?.name}</p>
      </div>

      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={projects.length} />
        <StatCard label="As Admin" value={adminCount} />
        <StatCard label="As Collaborator" value={collabCount} />
        <StatCard label="Total Members" value={totalMembers} />
      </div>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">My Projects</h2>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <Input
            type="text"
            placeholder="Search projects by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-[#e8e8ef]"
          />
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'admin', 'collaborator'].map((r) => (
            <Button
              key={r}
              variant={roleFilter === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter(r)}
              className={
                roleFilter === r
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'border-slate-200 text-slate-600 bg-white dark:border-slate-800 dark:text-slate-400 dark:bg-slate-900'
              }
            >
              {r === 'all' ? 'All' : r === 'admin' ? 'As Admin' : 'As Collaborator'}
            </Button>
          ))}
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState
          message={
            projects.length === 0
              ? 'No projects yet. Create your first project to get started.'
              : 'No projects match your filter or search query.'
          }
          icon={<FolderKanban className="h-6 w-6" />}
          action={
            projects.length === 0
              ? { label: 'Create Project', onClick: () => setDialogOpen(true) }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const role = getUserRole(project)
            return (
              <Card
                key={project._id}
                className="flex flex-col border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <Link to={`/projects/${project._id}`} className="flex flex-1 flex-col">
                  <CardContent className="flex flex-1 flex-col p-0">
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{project.name}</h3>
                      <Badge
                        variant="secondary"
                        className={
                          role === 'admin'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }
                      >
                        {role}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500 dark:text-slate-400">
                      {project.description || 'No description'}
                    </p>
                    <div className="mt-4 flex items-center border-t border-slate-100 dark:border-slate-800 pt-3">
                      <MemberAvatarStack members={project.members} />
                      <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
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
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
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
