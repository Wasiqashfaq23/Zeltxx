import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderKanban } from 'lucide-react'
import { getProjects, createProject } from '../../api/projects'
import { useAuth } from '../../context/AuthContext'
import Layout from '../../components/layout/Layout'
import Loader from '../../components/ui/Loader'
import EmptyState from '../../components/ui/EmptyState'
import { MemberAvatarStack } from '../../components/ui/UserAvatar'
import { Button } from '@/components/ui/button'
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

const AdminProjectList = () => {
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

  const adminProjects = projects.filter((project) => getUserRole(project) === 'admin')

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

  if (loading) return <Loader />

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Projects</h1>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {adminProjects.length === 0 ? (
        <EmptyState
          message="You are not an admin on any projects"
          icon={<FolderKanban className="h-6 w-6" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminProjects.map((project) => (
            <Card
              key={project._id}
              className="flex flex-col border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <CardContent className="flex flex-1 flex-col p-0">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{project.name}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500 dark:text-slate-400">
                  {project.description || 'No description'}
                </p>
                <div className="mt-4 flex items-center border-t border-slate-100 dark:border-slate-800 pt-3">
                  <MemberAvatarStack members={project.members} />
                  <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                    {project.members.length} members
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    onClick={() => navigate(`/projects/${project._id}`)}
                  >
                    Open Workspace
                  </Button>
                  <Button
                    variant="outline"
                    className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => navigate(`/admin/projects/${project._id}`)}
                  >
                    Admin Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Create New Project</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Add a new project to your workspace</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="admin-name" className="text-slate-700 dark:text-slate-300">Name</Label>
              <Input
                id="admin-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="admin-desc" className="text-slate-700 dark:text-slate-300">Description</Label>
              <Input
                id="admin-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
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

export default AdminProjectList
