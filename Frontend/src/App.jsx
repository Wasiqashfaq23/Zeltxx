import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Loader from './components/ui/Loader'
import Login from './pages/auth/Login'
import Unauthorized from './pages/Unauthorized'
import NotFound from './pages/NotFound'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const AdminProjectList = lazy(() => import('./pages/admin/AdminProjectList'))
const AdminProjectDetail = lazy(() => import('./pages/admin/AdminProjectDetail'))
const UserManagement = lazy(() => import('./pages/admin/UserManagement'))
const MyStats = lazy(() => import('./pages/MyStats'))
const Profile = lazy(() => import('./pages/Profile'))
const SearchPage = lazy(() => import('./pages/Search'))

const App = () => {
  return (
    <Suspense fallback={<Loader />}>
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
          <Route path="/search" element={<SearchPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App