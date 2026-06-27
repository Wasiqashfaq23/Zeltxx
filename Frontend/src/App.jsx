import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Login from './pages/auth/Login'
import AdminDashboard from './pages/admin/AdminDashboard'
import ProjectList from './pages/admin/ProjectList'
import ProjectDetail from './pages/admin/ProjectDetail'
import UserManagement from './pages/admin/UserManagement'
import CollabDashboard from './pages/collaborator/CollabDashboard'
import MyProject from './pages/collaborator/MyProject'
import MyStats from './pages/collaborator/MyStats'
import NotFound from './pages/shared/NotFound'

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<CollabDashboard />} />
        <Route path="/projects/:id" element={<MyProject />} />
        <Route path="/stats" element={<MyStats />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/projects" element={<ProjectList />} />
        <Route path="/admin/projects/:id" element={<ProjectDetail />} />
        <Route path="/admin/users" element={<UserManagement />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App