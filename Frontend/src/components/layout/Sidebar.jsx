import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Sidebar = () => {
  const { user } = useAuth()

  return (
    <aside>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/stats">My Stats</Link>
    </aside>
  )
}

export default Sidebar