import Project from '../models/project.js'
import Task from '../models/task.js'
import Resource from '../models/resource.js'
import { handleControllerError } from '../middleware/errorHandler.js'

const escapeRegex = (input) => String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const globalSearch = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q) {
      return res.json({ projects: [], tasks: [], notes: [], resources: [] })
    }

    const rx = new RegExp(escapeRegex(q), 'i')
    const memberProjects = await Project.find(
      { members: { $elemMatch: { user: req.user._id } }, isActive: true },
      '_id'
    ).lean()
    const projectIds = memberProjects.map((p) => p._id)
    if (!projectIds.length) {
      return res.json({ projects: [], tasks: [], notes: [], resources: [] })
    }

    const [projects, tasks, notes, resources] = await Promise.all([
      Project.find({ _id: { $in: projectIds }, $or: [{ name: rx }, { description: rx }] })
        .select('name description members')
        .populate('members.user', 'name')
        .limit(20)
        .lean(),
      Task.find({ project: { $in: projectIds }, $or: [{ title: rx }, { description: rx }] })
        .populate('project', 'name')
        .populate('assignedTo', 'name email')
        .limit(20)
        .lean(),
      Project.find({ _id: { $in: projectIds }, notes: rx })
        .select('name notes')
        .limit(10)
        .lean(),
      Resource.find({ project: { $in: projectIds }, $or: [{ title: rx }, { url: rx }] })
        .populate('project', 'name')
        .limit(20)
        .lean()
    ])

    const notesWithMatches = notes.map((p) => {
      const idx = (p.notes || '').toLowerCase().indexOf(q.toLowerCase())
      const start = Math.max(0, idx - 60)
      return {
        projectId: p._id,
        projectName: p.name,
        snippet: (p.notes || '').slice(start, start + 160)
      }
    })

    res.json({ projects, tasks, notes: notesWithMatches, resources })
  } catch (err) {
    handleControllerError(res, err)
  }
}