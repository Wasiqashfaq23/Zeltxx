import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProjects, createProject } from '../api/projects'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'

const Dashboard = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    getProjects()
      .then((res) => setProjects(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const getUserRole = (project) =>
    project.members.find((m) => m.user._id === user._id)?.role

  const handleCreate = (e) => {
    e.preventDefault()
    createProject({ name, description })
      .then((res) => {
        setProjects((prev) => [...prev, res.data])
        setName('')
        setDescription('')
        setShowCreateForm(false)
      })
      .catch((err) => console.error(err))
  }

  if (loading) return <Loader />

  return (
    <div>
      <Navbar />
      <Sidebar />
      <main>
        <h1>Dashboard</h1>

        <button type="button" onClick={() => setShowCreateForm((prev) => !prev)}>
          Create Project
        </button>

        {showCreateForm && (
          <form onSubmit={handleCreate}>
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
            <button type="submit">Submit</button>
          </form>
        )}

        {projects.length === 0 ? (
          <EmptyState message="You are not part of any projects yet" />
        ) : (
          <div>
            {projects.map((project) => {
              const role = getUserRole(project)
              return (
                <div key={project._id}>
                  <h2>{project.name}</h2>
                  <p>{project.description}</p>
                  <p>Your role: {role}</p>
                  <p>Members: {project.members.length}</p>
                  <Link to={`/projects/${project._id}`}>
                    <button type="button">View Project</button>
                  </Link>
                  {role === 'admin' && (
                    <Link to={`/admin/projects/${project._id}`}>
                      <button type="button">Manage</button>
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
