import { useAuth } from '../../context/AuthContext'

const Navbar = () => {
  const { user, logout } = useAuth()

  return (
    <nav>
      <span>Zeliq</span>
      <span>{user?.name}</span>
      <button type="button" onClick={logout}>Logout</button>
    </nav>
  )
}

export default Navbar
