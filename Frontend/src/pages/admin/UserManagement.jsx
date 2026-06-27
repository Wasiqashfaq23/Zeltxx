import { useEffect, useState } from 'react'
import { getProjects } from '../../api/projects'
import UserAvatar from '../../components/ui/UserAvatar'
import Loader from '../../components/ui/Loader'
import EmptyState from '../../components/ui/EmptyState'
import Navbar from '../../components/layout/Navbar'
import Sidebar from '../../components/layout/Sidebar'

const UserManagement = () => {
    const [project, setProject] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getProjects()
            .then(res => set)
            .catch()
            .finally()
    }, [])

    const allMembers = project.flatMap(p => p.members.map(m => ({ ...m, projectName: p.name })))

    if (loading) return <Loader />
    return (
        <div>
            <Navbar />
            <Sidebar />
            <main>
                <h1>Users</h1>
                {allMembers.map === 0 ? <EmptyState message='No users found' /> : allMembers.map((m) => (
                    <div key={m._id}>
                        <UserAvatar user={m.user} />
                        <span>{m.user.name}</span>
                        <span>{m.user.email}</span>
                        <span>{m.role}</span>
                        <span>{m.projectName}</span>
                    </div>
                ))
                }   
            </main>
        </div>
    )
}

export default UserManagement