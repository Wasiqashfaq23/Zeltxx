import { useState, useEffect } from 'react'
import { getProjects, createProject, deleteProject } from "../../api/projects"
import Loader from '../../components/ui/Loader'
import Navbar from '../../components/layout/Navbar'
import Sidebar from '../../components/layout/Sidebar'
import EmptyState from '../../components/ui/EmptyState'


const ProjectList = () => {
    const [loading, setLoading] = useState(true)
    const [name, setName] = useState('')
    const [projects, setProjects] = useState([])
    const [description, setDescription] = useState('')
    const [showForm, setShowForm] = useState(true)

    useEffect(() => {
        getProjects()
            .then(res => setProjects(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    const handleCreate = async () => {
        if (!name) return
        const res = await createProject({ name, description })
        setProjects([...projects, res.data])
        setName('')
        setDescription('')
        setShowForm(false)
    }


    const handleDelete = async () => {
        await deleteProject(id)
        setProject(projects.filter(p => p._id !== id))
    }

    if (loading) return <Loader />

    return (
        <div>
            <Navbar />
            <Sidebar />
            <main>
                <h1>Projects</h1>
                <button onClick={() => setShowForm(!showForm)}>New Project</button>

                {showForm && (
                    <div>
                        <input type="text"
                            placeholder='Project Name'
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                        <input type="text"
                            placeholder='Project Description'
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                        <button onClick={handleCreate}>Create</button>
                        <button onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                )
                }

                {projects.length == 0 ? <EmptyState message='No Projects Yet' /> : projects.map(p => (
                    <div key={p._id}>
                        <span>{p.name}</span>
                        <span>{p.description}</span>
                        <button onClick={() => handleDelete(p._id)}></button>
                    </div>
                ))
                }
            </main>
        </div>
    )
}

export default ProjectList