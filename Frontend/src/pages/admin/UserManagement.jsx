import { useEffect, useState } from 'react'
import { getProjects } from '../../api/projects'
import Layout from '../../components/layout/Layout'
import Loader from '../../components/ui/Loader'
import EmptyState from '../../components/ui/EmptyState'
import UserAvatar from '../../components/ui/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  if (loading) return <Loader />

  return (
    <Layout>
      <h1 className="mb-6 text-2xl font-bold text-[#1a1a2e]">Users</h1>

      <Card className="border-[#e8e8ef] bg-white shadow-sm">
        <CardHeader className="border-b border-[#e8e8ef] px-5 py-4">
          <CardTitle className="text-base font-semibold">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {uniqueMembers.length === 0 ? (
            <EmptyState message="No users found" />
          ) : (
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
                {uniqueMembers.map((m) => (
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
          )}
        </CardContent>
      </Card>
    </Layout>
  )
}

export default UserManagement
