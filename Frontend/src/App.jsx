import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Login from './pages/auth/Login'
import Dashboard from './pages/Dashboard'
import ProjectPage from './pages/ProjectPage'
import AdminProjectList from './pages/admin/AdminProjectList'
import AdminProjectDetail from './pages/admin/AdminProjectDetail'
import UserManagement from './pages/admin/UserManagement'
import MyStats from './pages/MyStats'
import Profile from './pages/Profile'
import Unauthorized from './pages/Unauthorized'
import NotFound from './pages/NotFound'

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/projects/:id/contribute" element={<ProjectPage />} />
        <Route path="/admin/projects" element={<AdminProjectList />} />
        <Route path="/admin/projects/:id" element={<AdminProjectDetail />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/stats" element={<MyStats />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
