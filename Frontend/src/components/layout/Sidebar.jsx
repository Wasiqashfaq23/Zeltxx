import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Sidebar = () => {
  const { logout } = useAuth()

  return (
    <aside>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/stats">My Stats</Link>
      <Link to="/admin/projects">Admin Projects</Link>
      <button type="button" onClick={logout}>Logout</button>
    </aside>
  )
}

export default Sidebar
