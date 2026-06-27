import { useAuth } from '../../context/AuthContext'

const Navbar = () => {
  const { user, logout } = useAuth()

  return (
    <nav>
      <span>Zeltxx</span>
      <span>{user?.name}</span>
      <button onClick={logout}>Logout</button>
    </nav>
  )
}

export default Navbar