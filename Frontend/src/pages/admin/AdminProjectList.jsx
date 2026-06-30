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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Projects</h1>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#4f46e5] hover:bg-[#4338ca]"
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
        <div className="grid grid-cols-3 gap-4">
          {adminProjects.map((project) => (
            <Card
              key={project._id}
              className="flex flex-col border-[#e8e8ef] bg-white p-5 shadow-sm transition-all hover:border-[#4f46e5] hover:shadow-md"
            >
              <CardContent className="flex flex-1 flex-col p-0">
                <h3 className="text-base font-semibold text-[#1a1a2e]">{project.name}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-[#6b7280]">
                  {project.description || 'No description'}
                </p>
                <div className="mt-4 flex items-center border-t border-[#e8e8ef] pt-3">
                  <MemberAvatarStack members={project.members} />
                  <span className="ml-2 text-xs text-[#9ca3af]">
                    {project.members.length} members
                  </span>
                </div>
                <Button
                  className="mt-4 w-full bg-[#4f46e5] hover:bg-[#4338ca]"
                  onClick={() => navigate(`/admin/projects/${project._id}`)}
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
          ))}
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
              <Label htmlFor="admin-name">Name</Label>
              <Input
                id="admin-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 border-[#e8e8ef]"
              />
            </div>
            <div>
              <Label htmlFor="admin-desc">Description</Label>
              <Input
                id="admin-desc"
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

export default AdminProjectList
