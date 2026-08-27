import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { getProjects } from '../../api/projects'
import Layout from '../../components/layout/Layout'
import Loader from '../../components/ui/Loader'
import EmptyState from '../../components/ui/EmptyState'
import UserAvatar from '../../components/ui/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

const UserManagement = () => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    getProjects()
      .then((res) => setProjects(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const allMembers = projects.flatMap((p) =>
    p.members.map((m) => ({ ...m, projectName: p.name, key: `${p._id}-${m.user._id || m.user}` }))
  )

  const uniqueMembers = Object.values(
    allMembers.reduce((acc, m) => {
      const id = m.user._id || m.user
      if (!acc[id]) acc[id] = m
      return acc
    }, {})
  )

  const filteredMembers = uniqueMembers.filter((m) => {
    const q = searchQuery.toLowerCase()
    return (
      m.user.name.toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q)
    )
  })

  if (loading) return <Loader />

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Users</h1>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
            {uniqueMembers.length} Total
          </Badge>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">All Workspace Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredMembers.length === 0 ? (
            <EmptyState
              message={
                uniqueMembers.length === 0
                  ? 'No users found'
                  : 'No users match your search query'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent dark:border-slate-800">
                    <TableHead className="text-slate-500 dark:text-slate-400">User</TableHead>
                    <TableHead className="text-slate-500 dark:text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-500 dark:text-slate-400">Role</TableHead>
                    <TableHead className="text-slate-500 dark:text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((m) => (
                    <TableRow key={m.key || m.user._id} className="border-slate-100 dark:border-slate-800/60">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserAvatar user={m.user} size="sm" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">{m.user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400">{m.user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            m.role === 'admin'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }
                        >
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 dark:text-slate-500">—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  )
}

export default UserManagement
