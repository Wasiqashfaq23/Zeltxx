import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
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
import Navbar from '../../components/layout/Navbar'
import Sidebar from '../../components/layout/Sidebar'
import Loader from '../../components/ui/Loader'
import EmptyState from '../../components/ui/EmptyState'
import UserAvatar from '../../components/ui/UserAvatar'
import ContributionBarChart from '../../components/charts/ContributionBarChart'
import ActivityLineChart from '../../components/charts/ActivityLineChart'
import ContribTypeDonut from '../../components/charts/ContribTypeDonut'
import { daysAgo } from '../../utils/chartHelpers'

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
      .then((res) => setProject(res.data))
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

  const totalContributions = summary.reduce((sum, entry) => sum + entry.totalCount, 0)
  const rankedSummary = [...summary].sort((a, b) => b.totalWeight - a.totalWeight)
  const combinedBreakdown = summary.reduce((acc, entry) => acc.concat(entry.breakdown || []), [])

  return (
    <div>
      <Navbar />
      <Sidebar />
      <main>
        <h1>{project.name}</h1>
        <p>{project.description}</p>

        <h2>Edit Project</h2>
        <form onSubmit={handleSave}>
          <div>
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Description
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
          <button type="submit">Save</button>
        </form>

        <h2>Members</h2>
        {project.members.length === 0 ? (
          <EmptyState message="No members yet" />
        ) : (
          <div>
            {project.members.map((member) => (
              <div key={member.user._id}>
                <UserAvatar user={member.user} />
                <span>{member.user.name}</span>
                <span>{member.user.email}</span>
                <span>{member.role}</span>
                <button type="button" onClick={() => handleRemove(member.user._id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <h2>Invite Member</h2>
        <form onSubmit={handleInvite}>
          <div>
            <label>
              User ID
              <input
                type="text"
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Role
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="admin">admin</option>
                <option value="collaborator">collaborator</option>
              </select>
            </label>
          </div>
          <button type="submit">Invite</button>
        </form>

        <h2>Contribution Leaderboard</h2>
        {rankedSummary.length === 0 ? (
          <EmptyState message="No contributions yet" />
        ) : (
          <div>
            {rankedSummary.map((entry, index) => {
              const percentage =
                totalContributions > 0
                  ? ((entry.totalCount / totalContributions) * 100).toFixed(1)
                  : 0
              return (
                <div key={entry._id}>
                  <span>{index + 1}</span>
                  <span>{entry.user.name}</span>
                  <span>{entry.totalCount}</span>
                  <span>{entry.totalWeight}</span>
                  <span>{percentage}%</span>
                </div>
              )
            })}
          </div>
        )}

        <ContributionBarChart summary={summary} />
        <ActivityLineChart snapshots={snapshots} members={project?.members || []} />
        <ContribTypeDonut breakdown={combinedBreakdown} />

        <button type="button" onClick={handleDelete}>
          Delete Project
        </button>
      </main>
    </div>
  )
}

export default AdminProjectDetail
