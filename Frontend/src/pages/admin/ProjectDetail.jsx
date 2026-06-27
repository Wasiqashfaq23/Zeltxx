import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getProjectById, inviteMember, removeMember, updateProject } from '../../api/projects'
import { getProjectSummary } from "../../api/contributions";
import { getSnapshotsByRange } from "../../api/snapshots";
import Loader from "../../components/ui/Loader";
import UserAvatar from "../../components/ui/UserAvatar";
import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";

const ProjectDetail = () => {
    const { id } = useParams()
    const [project, setProject] = useState(null)
    const [summary, setSummary] = useState([])
    const [loading, setLoading] = useState(true)
    const [inviteEmail, setInviteEmail] = useState('')
    const [editing, setEditing] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDescription, setNewDescription] = useState('')

    useEffect(() => {
        Promise.all([
            getProjectById(id),
            getProjectSummary(id)
        ])
            .then(([projRes, sumRes]) => {
                setProject(projRes.data)
                setSummary(sumRes.data)
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [id])


    const handleRemove = async () => {
        await removeMember(id, userId)
        setProject(prev => ({
            ...prev,
            members: prev.members.filter(m => m.user._id !== userId)
        }))
    }

    const handleUpdate = async () => {
        const res = await updateProject(id, { name: newName, description: newDescription })
        setProject(res.data)
        setEditing(false)
    }


    if (loading) return <Loader />
    if (!project) return <div>Project not found</div>


    return (
        <div>
            <Navbar />
            <Sidebar />
            <main>
                <h1>{project.name}</h1>
                <p>{project.description}</p>

                <button onClick={() => {
                    setNewName(project.name)
                    setNewDescription(project.description)
                    setEditing(true)
                }}>Edit</button>

                {editing && (
                    <div>
                        <input
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Project name"
                        />
                        <input
                            value={newDescription}
                            onChange={e => setNewDescription(e.target.value)}
                            placeholder="Description"
                        />
                        <button onClick={handleUpdate}>Save</button>
                        <button onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                )}

                <h2>Members</h2>
                {project.members.map(m => (
                    <div key={m._id}>
                        <UserAvatar user={m.uesr} />
                        <span>{m.user.name}</span>
                        <span>{m.role}</span>
                        <button onClick={() => handleRemove(m.user._id)}>Remove</button>
                    </div>
                ))}


                <h2>Invite Member</h2>
                <div>
                    <input
                        placeholder="User ID"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                    />
                    <button onClick={async () => {
                        const res = await inviteMember(id, { userId: inviteEmail, role: 'collaborator' })
                        setProject(res.data)
                        setInviteEmail('')
                    }}>Invite</button>
                </div>


                <h2>Conribution Sumary</h2>
                {summary.map(s => (
                    <div key={s._id}>
                        <span>{s.user.name}</span>
                        <span>Count: {s.totalCount}</span>
                        <span>Score: {s.totalWeight}</span>
                    </div>
                ))}
            </main>
        </div>
    )
}

export default ProjectDetail