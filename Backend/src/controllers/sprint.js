import Sprint from '../models/sprint.js'
import Task from '../models/task.js'
import Project from '../models/project.js'
import { handleControllerError } from '../middleware/errorHandler.js'

const getProjectForUser = async (projectId) => {
  const project = await Project.findById(projectId)
  if (!project || !project.isActive) return null
  return project
}

const isAdmin = (project, userId) =>
  project.members.some(
    (m) => m.user.toString() === userId.toString() && m.role === 'admin'
  )

export const getSprints = async (req, res) => {
  try {
    const { projectId } = req.params
    const project = await getProjectForUser(projectId)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    if (!project.members.some((m) => m.user.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view sprints in this project' })
    }

    const [sprints, counts] = await Promise.all([
      Sprint.find({ project: projectId }).sort({ startDate: -1 }),
      Task.aggregate([
        { $match: { project: projectId, sprint: { $ne: null } } },
        {
          $group: {
            _id: '$sprint',
            total: { $sum: 1 },
            todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
            in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } }
          }
        }
      ])
    ])

    const countsMap = {}
    for (const c of counts) countsMap[String(c._id)] = c

    const result = sprints.map((s) => {
      const stat = countsMap[String(s._id)] || { total: 0, todo: 0, in_progress: 0, done: 0 }
      return {
        _id: s._id,
        name: s.name,
        goal: s.goal,
        startDate: s.startDate,
        endDate: s.endDate,
        ...stat
      }
    })

    res.json({ sprints: result, isAdmin: isAdmin(project, req.user._id) })
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const createSprint = async (req, res) => {
  try {
    const { projectId } = req.params
    const { name, goal, startDate, endDate } = req.body
    const project = await getProjectForUser(projectId)
    if (!project) return res.status(404).json({ message: 'Project not found' })

    if (!isAdmin(project, req.user._id)) {
      return res.status(403).json({ message: 'Only admins can create sprints' })
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Sprint name is required' })
    }
    if (!startDate || !endDate || new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' })
    }

    const sprint = await Sprint.create({
      project: projectId,
      name: name.trim().slice(0, 120),
      goal: String(goal || '').slice(0, 500),
      startDate,
      endDate
    })
    res.status(201).json(sprint)
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const updateSprint = async (req, res) => {
  try {
    const { id } = req.params
    const sprint = await Sprint.findById(id)
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' })

    const project = await getProjectForUser(sprint.project)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    if (!isAdmin(project, req.user._id)) {
      return res.status(403).json({ message: 'Only admins can edit sprints' })
    }

    const { name, goal, startDate, endDate } = req.body
    if (name !== undefined && String(name).trim()) sprint.name = String(name).trim().slice(0, 120)
    if (goal !== undefined) sprint.goal = String(goal || '').slice(0, 500)
    if (startDate) sprint.startDate = startDate
    if (endDate) sprint.endDate = endDate
    if (sprint.endDate <= sprint.startDate) {
      return res.status(400).json({ message: 'End date must be after start date' })
    }

    await sprint.save()
    res.json(sprint)
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const deleteSprint = async (req, res) => {
  try {
    const { id } = req.params
    const sprint = await Sprint.findById(id)
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' })

    const project = await getProjectForUser(sprint.project)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    if (!isAdmin(project, req.user._id)) {
      return res.status(403).json({ message: 'Only admins can delete sprints' })
    }

    await Sprint.findByIdAndDelete(id)
    await Task.updateMany({ sprint: id }, { $set: { sprint: null } })
    res.json({ message: 'Sprint deleted' })
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const getBurndown = async (req, res) => {
  try {
    const { id } = req.params
    const sprint = await Sprint.findById(id)
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' })

    const project = await getProjectForUser(sprint.project)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    if (!project.members.some((m) => m.user.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view burndown for this project' })
    }

    const tasks = await Task.find({ sprint: id }).select('status doneAt updatedAt')
    const total = tasks.length

    const doneDates = tasks.filter((t) => t.status === 'done').map((t) => t.doneAt || t.updatedAt)

    const now = new Date()
    const start = new Date(sprint.startDate)
    const rawEnd = new Date(sprint.endDate)
    const end = rawEnd > now ? now : rawEnd
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const dates = []
    for (let d = startOfDay(start); d <= startOfDay(end); d = new Date(d.getTime() + 86400000)) {
      dates.push(d)
    }
    if (!dates.length) dates.push(startOfDay(start))

    const doneByEndOfDay = (day) => doneDates.filter((t) => t && new Date(t) <= new Date(day.getTime() + 86399999)).length

    const ideal = []
    const actual = []
    const n = dates.length
    dates.forEach((day, idx) => {
      ideal.push(Math.round(total * (1 - (n > 1 ? idx / (n - 1) : 1))))
      actual.push(Math.max(0, total - doneByEndOfDay(day)))
    })

    res.json({
      total,
      doneCount: doneDates.length,
      inProgressCount: tasks.filter((t) => t.status === 'in_progress').length,
      todoCount: tasks.filter((t) => t.status === 'todo').length,
      dates: dates.map((d) => d.toISOString().slice(0, 10)),
      ideal,
      actual
    })
  } catch (err) {
    handleControllerError(res, err)
  }
}