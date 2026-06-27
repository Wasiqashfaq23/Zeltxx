import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProjectById } from '../api/projects'
import { getContributions, logContribution } from '../api/contributions'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'
import UserAvatar from '../components/ui/UserAvatar'
import ContribBadge from '../components/ui/ContribBadge'

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
  const { user } = useAuth()
  const socket = useSocket()
  const [project, setProject] = useState(null)
  const [contributions, setContributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
        setShowForm(false)
      })
      .catch((err) => console.error(err))
  }

  if (loading) return <Loader />

  return (
    <div>
      <Navbar />
      <Sidebar />
      <main>
        <h1>{project.name}</h1>
        <p>{project.description}</p>

        {role === 'admin' && (
          <Link to={`/admin/projects/${id}`}>Manage Project</Link>
        )}

        <button type="button" onClick={() => setShowForm((prev) => !prev)}>
          Log Contribution
        </button>

        {showForm && (
          <form onSubmit={handleSubmit}>
            <div>
              <label>
                Type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {CONTRIBUTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label>
                Message
                <input
                  type="text"
                  value={meta}
                  onChange={(e) => setMeta(e.target.value)}
                />
              </label>
            </div>
            <button type="submit">Submit</button>
          </form>
        )}

        <h2>Activity Feed</h2>
        {contributions.length === 0 ? (
          <EmptyState message="No contributions yet" />
        ) : (
          <div>
            {contributions.map((contribution) => (
              <div key={contribution._id}>
                <UserAvatar user={contribution.user} />
                <span>{contribution.user?.name}</span>
                <ContribBadge type={contribution.type} />
                {contribution.meta && <span>{contribution.meta}</span>}
                <span>{new Date(contribution.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default ProjectPage
