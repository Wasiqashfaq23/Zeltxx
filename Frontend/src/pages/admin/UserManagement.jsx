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
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Users</h1>
          <Badge variant="secondary" className="bg-[#ede9fe] text-[#4f46e5]">
            {uniqueMembers.length} Total
          </Badge>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-[#e8e8ef]"
          />
        </div>
      </div>

      <Card className="border-[#e8e8ef] bg-white shadow-sm">
        <CardHeader className="border-b border-[#e8e8ef] px-5 py-4">
          <CardTitle className="text-base font-semibold">All Workspace Users</CardTitle>
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
                  <TableRow className="border-[#e8e8ef] hover:bg-transparent">
                    <TableHead className="text-[#6b7280]">User</TableHead>
                    <TableHead className="text-[#6b7280]">Email</TableHead>
                    <TableHead className="text-[#6b7280]">Role</TableHead>
                    <TableHead className="text-[#6b7280]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((m) => (
                    <TableRow key={m.key || m.user._id} className="border-[#f0f0f5]">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserAvatar user={m.user} size="sm" />
                          <span className="font-medium text-[#1a1a2e]">{m.user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#6b7280]">{m.user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            m.role === 'admin'
                              ? 'bg-[#ede9fe] text-[#4f46e5]'
                              : 'bg-[#f4f4f7] text-[#6b7280]'
                          }
                        >
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#9ca3af]">—</TableCell>
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
