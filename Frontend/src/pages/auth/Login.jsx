import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Loader from '../../components/ui/Loader'

const Login = () => {
  const { user, loading } = useAuth()

  if (loading) return <Loader />
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div>
      <a href="http://localhost:5000/api/auth/google">Sign in with Google</a>
    </div>
  )
}

export default Login
