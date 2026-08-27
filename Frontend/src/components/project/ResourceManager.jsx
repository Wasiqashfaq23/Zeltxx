import { useState, useEffect } from 'react'
import { Plus, ExternalLink, Trash2, FolderGit2, BookOpen, Palette, Link as LinkIcon } from 'lucide-react'
import { getResources, createResource, deleteResource } from '../../api/resource'
import { useSocket } from '../../context/SocketContext'
import UserAvatar from '../ui/UserAvatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
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

const CATEGORY_ICONS = {
  repo: FolderGit2,
  docs: BookOpen,
  design: Palette,
  other: LinkIcon
}

const CATEGORY_STYLES = {
  repo: 'bg-blue-50 text-blue-700 border-blue-200',
  docs: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  design: 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200'
}

const ResourceManager = ({ projectId }) => {
  const socket = useSocket()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('other')

  useEffect(() => {
    getResources(projectId)
      .then((res) => setResources(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    if (!socket || !projectId) return

    const handleAdded = (res) => {
      setResources((prev) => [res, ...prev.filter((r) => r._id !== res._id)])
    }

    const handleDeleted = (resId) => {
      setResources((prev) => prev.filter((r) => r._id !== resId))
    }

    socket.on('resource_added', handleAdded)
    socket.on('resource_deleted', handleDeleted)

    return () => {
      socket.off('resource_added', handleAdded)
      socket.off('resource_deleted', handleDeleted)
    }
  }, [socket, projectId])

  const handleCreate = (e) => {
    e.preventDefault()
    createResource(projectId, { title, url, category })
      .then((res) => {
        setResources((prev) => [res.data, ...prev.filter((r) => r._id !== res.data._id)])
        setTitle('')
        setUrl('')
        setCategory('other')
        setCreateOpen(false)
      })
      .catch((err) => console.error(err))
  }

  const handleDelete = (id) => {
    deleteResource(id)
      .then(() => setResources((prev) => prev.filter((r) => r._id !== id)))
      .catch((err) => console.error(err))
  }

  const filteredResources = resources.filter(
    (r) => categoryFilter === 'all' || r.category === categoryFilter
  )

  if (loading) {
    return <div className="py-8 text-center text-sm text-[#9ca3af]">Loading resources...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['all', 'repo', 'docs', 'design', 'other'].map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="xs"
              onClick={() => setCategoryFilter(cat)}
              className={
                categoryFilter === cat
                  ? 'bg-[#4f46e5] text-white hover:bg-[#4338ca]'
                  : 'border-[#e8e8ef] text-[#6b7280]'
              }
            >
              {cat.toUpperCase()}
            </Button>
          ))}
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#4f46e5] hover:bg-[#4338ca]"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Resource
        </Button>
      </div>

      {filteredResources.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#9ca3af]">
          No resources found for this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredResources.map((res) => {
            const IconComponent = CATEGORY_ICONS[res.category] || LinkIcon
            return (
              <Card
                key={res._id}
                className="border-[#e8e8ef] bg-white p-4 shadow-xs hover:shadow-sm transition-all"
              >
                <CardContent className="p-0 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-[#f4f4f7]">
                        <IconComponent className="h-4 w-4 text-[#4f46e5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#1a1a2e]">{res.title}</h4>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#4f46e5] hover:underline truncate max-w-[200px] block"
                        >
                          {res.url}
                        </a>
                      </div>
                    </div>

                    <Badge variant="secondary" className={`text-[10px] uppercase font-bold ${CATEGORY_STYLES[res.category]}`}>
                      {res.category}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f5]">
                    <div className="flex items-center gap-2">
                      <UserAvatar user={res.addedBy} size="xs" />
                      <span className="text-xs text-[#9ca3af]">
                        {res.addedBy?.name || 'Member'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#4f46e5] hover:underline"
                      >
                        Launch <ExternalLink className="h-3 w-3" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(res._id)}
                        className="hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-[#e8e8ef] bg-white">
          <DialogHeader>
            <DialogTitle>Add Resource / Link</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="res-title">Title</Label>
              <Input
                id="res-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. GitHub Repository, Figma Design System"
                required
                className="mt-1 border-[#e8e8ef]"
              />
            </div>

            <div>
              <Label htmlFor="res-url">URL</Label>
              <Input
                id="res-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/..."
                required
                className="mt-1 border-[#e8e8ef]"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 w-full border-[#e8e8ef]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repo">Repository (GitHub/GitLab)</SelectItem>
                  <SelectItem value="docs">Documentation</SelectItem>
                  <SelectItem value="design">Design (Figma/Canva)</SelectItem>
                  <SelectItem value="other">Other Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#4f46e5] hover:bg-[#4338ca]">
                Add Resource
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ResourceManager
