import { useEffect, useState } from 'react'
import { getProjects } from '../../api/projects'
import { getSnapshots } from '../../api/snapshots'
import StatCard from '../../components/ui/StatCard'
import Loader from '../../components/ui/Loader'
import Navbar from '../../components/layout/Navbar'
import Sidebar from '../../components/layout/Sidebar'

const AdminDashboard = () => {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)


    useEffect(() => {
        getProjects()
            .then(res => setProjects(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <Loader />

    return (
        <div>
            <Navbar />
            <Sidebar />
            <main>
                <h1>Admin Dashboard</h1>
                <div>
                    <StatCard label="Total Projects" value={projects.length} />
                </div>
            </main>
        </div>
    )
} 

export default AdminDashboard