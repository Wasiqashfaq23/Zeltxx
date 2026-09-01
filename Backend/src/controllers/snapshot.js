import Snapshot from "../models/snapshot.js"
import Project from "../models/project.js"
import { handleControllerError } from '../middleware/errorHandler.js'

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

        const snapshots = await Snapshot.find({ project: projectId }).limit(750).populate('user', 'name email avatar').sort({ date: -1 })
        res.status(200).json(snapshots)
    } catch (err) {
        handleControllerError(res, err)
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

        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const toDate = to ? new Date(to) : new Date()
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date range' })
        }
        if (fromDate > toDate) {
            return res.status(400).json({ message: 'from must be before to' })
        }
        toDate.setHours(23, 59, 59, 999)

        const snapshots = await Snapshot.find({
            project: projectId,
            date: {
                $gte: fromDate,
                $lte: toDate
            }
        }).populate('user', 'name email avatar').sort({ date: 1 })

        res.status(200).json(snapshots)
    } catch(err) {
        handleControllerError(res, err)
    }
}