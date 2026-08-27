import Task from '../models/task.js'
import Project from '../models/project.js'
import Contribution from '../models/contribution.js'

/**
 * Helper to verify user is a member of the project
 */
async function verifyProjectMember(projectId, userId) {
  const project = await Project.findById(projectId)
  if (!project || !project.isActive) return false
  return project.members.some((m) => m.user.toString() === userId.toString())
}

export const getTasks = async (req, res) => {
  try {
    const { projectId } = req.params
    const isMember = await verifyProjectMember(projectId, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view tasks for this project' })
    }

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
    const { title, description, status, priority, assignedTo, dueDate, subtasks } = req.body

    const isMember = await verifyProjectMember(projectId, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to create tasks in this project' })
    }

    const task = await Task.create({
      project: projectId,
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      dueDate: dueDate || null,
      subtasks: subtasks || []
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

    const isMember = await verifyProjectMember(task.project, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to edit tasks in this project' })
    }

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

    const isMember = await verifyProjectMember(task.project, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to modify subtasks in this project' })
    }

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

    const isMember = await verifyProjectMember(task.project, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to modify subtasks in this project' })
    }

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

    const isMember = await verifyProjectMember(task.project, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to comment on tasks in this project' })
    }

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

    const isMember = await verifyProjectMember(task.project, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to delete tasks in this project' })
    }

    await Task.findByIdAndDelete(id)
    req.io?.to(task.project.toString()).emit('task_deleted', { id })
    res.json({ message: 'Task deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
