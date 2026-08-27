import Task from '../models/task.js'
import Project from '../models/project.js'
import Contribution from '../models/contribution.js'

export const getTasks = async (req, res) => {
  try {
    const { projectId } = req.params
    const project = await Project.findById(projectId)
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const isMember = project.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    )
    if (!isMember) return res.status(403).json({ message: 'Not a member of this project' })

    const tasks = await Task.find({ project: projectId })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .sort({ createdAt: -1 })

    res.json(tasks)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const createTask = async (req, res) => {
  try {
    const { projectId } = req.params
    const { title, description, priority, assignedTo, dueDate } = req.body

    const project = await Project.findById(projectId)
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const isMember = project.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    )
    if (!isMember) return res.status(403).json({ message: 'Not a member of this project' })

    const task = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      dueDate: dueDate || null,
      assignedTo: assignedTo || null,
      project: projectId,
      createdBy: req.user._id
    })

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'comments.user', select: 'name email avatar' }
    ])

    req.io?.to(projectId).emit('task_created', populated)
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, status, priority, assignedTo, dueDate } = req.body

    const task = await Task.findById(id)
    if (!task) return res.status(404).json({ message: 'Task not found' })

    const previousStatus = task.status

    if (title !== undefined) task.title = title
    if (description !== undefined) task.description = description
    if (status !== undefined) task.status = status
    if (priority !== undefined) task.priority = priority
    if (assignedTo !== undefined) task.assignedTo = assignedTo
    if (dueDate !== undefined) task.dueDate = dueDate

    await task.save()

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'comments.user', select: 'name email avatar' }
    ])

    // Auto-log contribution point if marked done for the first time
    if (status === 'done' && previousStatus !== 'done') {
      const contrib = await Contribution.create({
        project: task.project,
        user: req.user._id,
        type: 'task_complete',
        weight: 2,
        meta: `Completed task: "${task.title}"`
      })
      const populatedContrib = await contrib.populate('user', 'name email avatar')
      req.io?.to(task.project.toString()).emit('new_contribution', populatedContrib)
    }

    req.io?.to(task.project.toString()).emit('task_updated', populated)
    res.json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const addSubtask = async (req, res) => {
  try {
    const { id } = req.params
    const { title } = req.body

    const task = await Task.findById(id)
    if (!task) return res.status(404).json({ message: 'Task not found' })

    task.subtasks.push({ title, completed: false })
    await task.save()

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'comments.user', select: 'name email avatar' }
    ])

    req.io?.to(task.project.toString()).emit('task_updated', populated)
    res.json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const toggleSubtask = async (req, res) => {
  try {
    const { id, subtaskId } = req.params

    const task = await Task.findById(id)
    if (!task) return res.status(404).json({ message: 'Task not found' })

    const sub = task.subtasks.id(subtaskId)
    if (sub) {
      sub.completed = !sub.completed
      await task.save()
    }

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'comments.user', select: 'name email avatar' }
    ])

    req.io?.to(task.project.toString()).emit('task_updated', populated)
    res.json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const addTaskComment = async (req, res) => {
  try {
    const { id } = req.params
    const { text } = req.body

    const task = await Task.findById(id)
    if (!task) return res.status(404).json({ message: 'Task not found' })

    task.comments.push({
      user: req.user._id,
      text,
      createdAt: new Date()
    })
    await task.save()

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'comments.user', select: 'name email avatar' }
    ])

    req.io?.to(task.project.toString()).emit('task_updated', populated)
    res.json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params
    const task = await Task.findById(id)
    if (!task) return res.status(404).json({ message: 'Task not found' })

    const projectId = task.project.toString()
    await Task.findByIdAndDelete(id)

    req.io?.to(projectId).emit('task_deleted', id)
    res.json({ message: 'Task deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
