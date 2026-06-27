import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ProtectedRoute = ({ role }) => {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && !user.members?.some(m => m.role === role))
    return <Navigate to="/unauthorized" replace />

  return <Outlet />
}

export default ProtectedRoute