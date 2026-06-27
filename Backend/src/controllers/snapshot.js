import Snapshot from "../models/snapshot.js"
import Project from "../models/project.js"

export const getSnapshots = async (req, res) => {
    try {
        const {projectId} = req.params

        const project = await Project.findById(projectId)
        if (!project) {
            return res.status(404).json({ message: "Project not found" })
        }
        const isMember = project.members.some(m => m.user.toString() === req.user._id.toString())

        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this project" })
        }

        const snapshots = await Snapshot.find({ project: projectId }).populate('user', 'name email avatar').sort({ date: -1 })
        res.status(200).json(snapshots)
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

export const getSnapshotsByRange = async (req, res) => {
    try {

        const { projectId } = req.params

        const { from, to } = req.query

        const project = await Project.findById(projectId)
        if (!project) return res.status(404).json({ message: 'Project not found' })

        const isMember = project.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) return res.status(403).json({ message: 'Not a member of this project' })

        const snapshots = await Snapshot.find({
            project: projectId,
            date: {
                $gte: new Date(from),
                $lte: new Date(to)
            }
        }).populate('user', 'name email avatar').sort({ date: 1 })
        res.status(200).json(snapshots)
    }catch(err){
        res.status(500).json({message: err.message})
    }
}