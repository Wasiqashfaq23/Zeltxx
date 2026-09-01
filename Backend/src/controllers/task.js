import Task from '../models/task.js'
import Project from '../models/project.js'
import Sprint from '../models/sprint.js'
import { logContributionEvent } from '../services/contribution.service.js'
import { notifyMentions } from '../services/mention.service.js'
import { logActivity } from '../services/activity.service.js'
import { handleControllerError } from '../middleware/errorHandler.js'

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
      .populate('sprint', 'name startDate endDate')
      .populate('blockedBy', 'title status')
      .populate('timeEntries.user', 'name')
      .populate('attachments.uploadedBy', 'name')
      .populate('comments.reactions.user', 'name')
      .sort({ createdAt: -1 })
    res.json(tasks)
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const createTask = async (req, res) => {
  try {
    const { projectId } = req.params
    const { title, description, status, priority, assignedTo, dueDate, subtasks, sprint, blockedBy } = req.body

    const isMember = await verifyProjectMember(projectId, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to create tasks in this project' })
    }

    if (sprint) {
      const sprintDoc = await Sprint.findOne({ _id: sprint, project: projectId })
      if (!sprintDoc) {
        return res.status(400).json({ message: 'Sprint does not belong to this project' })
      }
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
      sprint: sprint || null,
      blockedBy: blockedBy || [],
      subtasks: subtasks || []
    })

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'comments.user', select: 'name email avatar' },
      { path: 'sprint', select: 'name startDate endDate' },
      { path: 'blockedBy', select: 'title status' },
      { path: 'timeEntries.user', select: 'name' },
      { path: 'attachments.uploadedBy', select: 'name' },
      { path: 'comments.reactions.user', select: 'name' }
    ])

    req.io?.to(projectId).emit('task_created', populated)
    await logActivity({
      projectId,
      actorId: req.user._id,
      actorName: req.user.name,
      type: 'task_created',
      message: `${req.user.name} created task "${task.title}"`,
      meta: { taskId: task._id.toString(), title: task.title },
      io: req.io
    })
    res.status(201).json(populated)
  } catch (err) {
    handleControllerError(res, err)
  }
}

const nextDueDate = (base, recurrence) => {
    const d = base instanceof Date ? new Date(base) : new Date()
    if (recurrence === 'daily') d.setDate(d.getDate() + 1)
    if (recurrence === 'weekly') d.setDate(d.getDate() + 7)
    if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
    return d
  }

// Shared next-occurrence spawner (recurring tasks).
export const spawnNextOccurrence = async (task) => {
  if (!task || !task.recurrence || task.recurrence === 'none' || task.recurringParent) return null
  const child = await Task.create({
    project: task.project,
    title: task.title,
    description: task.description,
    priority: task.priority,
    assignedTo: task.assignedTo,
    createdBy: task.createdBy,
    dueDate: nextDueDate(task.dueDate, task.recurrence),
    subtasks: (task.subtasks || []).map((s) => ({ title: s.title, completed: false })),
    recurrence: task.recurrence,
    recurringParent: task._id,
    sprint: task.sprint
  })
  return child
}

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, status, priority, assignedTo, dueDate, sprint, blockedBy, recurrence } = req.body

    const task = await Task.findById(id)
    if (!task) return res.status(404).json({ message: 'Task not found' })

    const isMember = await verifyProjectMember(task.project, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to edit tasks in this project' })
    }

    if (sprint !== undefined && sprint) {
      const sprintDoc = await Sprint.findOne({ _id: sprint, project: task.project })
      if (!sprintDoc) {
        return res.status(400).json({ message: 'Sprint does not belong to this project' })
      }
    }

    const previousStatus = task.status

    if (title !== undefined) task.title = title
    if (description !== undefined) task.description = description
    if (status !== undefined) task.status = status
    if (priority !== undefined) task.priority = priority
    if (assignedTo !== undefined) task.assignedTo = assignedTo
    if (dueDate !== undefined) task.dueDate = dueDate
    if (sprint !== undefined) task.sprint = sprint || null
    if (blockedBy !== undefined) {
      const ids = Array.isArray(blockedBy) ? blockedBy.filter(Boolean) : []
      const sameProject = await Task.countDocuments({
        _id: { $in: ids },
        project: task.project
      })
      if (sameProject !== ids.length) {
        return res.status(400).json({ message: 'Blocked-by tasks must belong to the same project' })
      }
      task.blockedBy = ids
    }
    if (recurrence !== undefined) {
      task.recurrence = ['none', 'daily', 'weekly', 'monthly'].includes(recurrence) ? recurrence : 'none'
    }

    // A task with unfinished blockers cannot be marked done.
    const statusNowDone = task.status === 'done' && previousStatus !== 'done'
    if (statusNowDone && task.blockedBy?.length) {
      const blockers = await Task.find({ _id: { $in: task.blockedBy } }).select('title status')
      const openBlockers = blockers.filter((b) => b.status !== 'done')
      if (openBlockers.length) {
        return res.status(409).json({
          message: `Cannot complete — blocked by unfinished task: "${openBlockers[0].title}"`
        })
      }
    }

    await task.save()

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'comments.user', select: 'name email avatar' },
      { path: 'sprint', select: 'name startDate endDate' },
      { path: 'blockedBy', select: 'title status' },
      { path: 'timeEntries.user', select: 'name' },
      { path: 'attachments.uploadedBy', select: 'name' },
      { path: 'comments.reactions.user', select: 'name' }
    ])

    // Recurring tasks re-queue their next occurrence when completed.
    if (statusNowDone && task.recurrence && task.recurrence !== 'none') {
      const child = await spawnNextOccurrence(task)
      if (child) {
        const childPopulated = await child.populate([
          { path: 'assignedTo', select: 'name email avatar' },
          { path: 'createdBy', select: 'name email avatar' }
        ])
        req.io?.to(task.project.toString()).emit('task_created', childPopulated)
      }
    }

    // Auto-log contribution point if marked done for the first time
    if (statusNowDone) {
      await logContributionEvent({
        projectId: task.project,
        userId: req.user._id,
        type: 'task_complete',
        meta: {
          taskId: task._id.toString(),
          title: task.title,
          note: `Completed task: "${task.title}"`
        },
        io: req.io,
        enforceDailyCap: true,
        dedupeQuery: { 'meta.taskId': task._id.toString() }
      })
    }

    req.io?.to(task.project.toString()).emit('task_updated', populated)
    res.json(populated)
  } catch (err) {
    handleControllerError(res, err)
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
      { path: 'comments.user', select: 'name email avatar' },
      { path: 'sprint', select: 'name startDate endDate' },
      { path: 'blockedBy', select: 'title status' },
      { path: 'timeEntries.user', select: 'name' },
      { path: 'attachments.uploadedBy', select: 'name' },
      { path: 'comments.reactions.user', select: 'name' }
    ])

    req.io?.to(task.project.toString()).emit('task_updated', populated)
    res.json(populated)
  } catch (err) {
    handleControllerError(res, err)
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
      { path: 'comments.user', select: 'name email avatar' },
      { path: 'sprint', select: 'name startDate endDate' },
      { path: 'blockedBy', select: 'title status' },
      { path: 'timeEntries.user', select: 'name' },
      { path: 'attachments.uploadedBy', select: 'name' },
      { path: 'comments.reactions.user', select: 'name' }
    ])

    req.io?.to(task.project.toString()).emit('task_updated', populated)
    res.json(populated)
  } catch (err) {
    handleControllerError(res, err)
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
      { path: 'comments.user', select: 'name email avatar' },
      { path: 'sprint', select: 'name startDate endDate' },
      { path: 'blockedBy', select: 'title status' },
      { path: 'timeEntries.user', select: 'name' },
      { path: 'attachments.uploadedBy', select: 'name' },
      { path: 'comments.reactions.user', select: 'name' }
    ])

    req.io?.to(task.project.toString()).emit('task_updated', populated)

    // Task comments count as lightweight "comment" contributions (daily capped).
    if (text && text.trim()) {
      await logContributionEvent({
        projectId: task.project,
        userId: req.user._id,
        type: 'comment',
        meta: { note: `Comment on task: "${task.title}"` },
        io: req.io,
        enforceDailyCap: true
      })
    }

    const membersDoc = await Project.findById(task.project)
      .select('members')
      .populate('members.user', 'name email')
    await notifyMentions({
      io: req.io,
      text,
      members: membersDoc?.members || [],
      actorName: req.user.name,
      projectId: task.project,
      context: `task "${task.title}"`
    })
    res.json(populated)
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const trackTaskTime = async (req, res) => {
  try {
    const { id } = req.params
    const { durationMinutes, note } = req.body

    const minutes = Math.round(Number(durationMinutes))
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
      return res.status(400).json({ message: 'Duration must be between 1 and 1440 minutes' })
    }

    const task = await Task.findById(id)
    if (!task) return res.status(404).json({ message: 'Task not found' })

    const isMember = await verifyProjectMember(task.project, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to track time on tasks in this project' })
    }

    task.timeEntries.push({
      user: req.user._id,
      durationMinutes: minutes,
      note: String(note || '').slice(0, 200)
    })
    await task.save()

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'comments.user', select: 'name email avatar' },
      { path: 'sprint', select: 'name startDate endDate' },
      { path: 'blockedBy', select: 'title status' },
      { path: 'timeEntries.user', select: 'name' },
      { path: 'attachments.uploadedBy', select: 'name' },
      { path: 'comments.reactions.user', select: 'name' }
    ])

    req.io?.to(task.project.toString()).emit('task_updated', populated)
    res.status(201).json(populated)
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const toggleTaskCommentReaction = async (req, res) => {
  try {
    const { id, commentId } = req.params
    const { emoji } = req.body
    if (!emoji || String(emoji).length > 8) {
      return res.status(400).json({ message: 'A valid reaction emoji is required' })
    }

    const task = await Task.findById(id)
    if (!task) return res.status(404).json({ message: 'Task not found' })

    const isMember = await verifyProjectMember(task.project, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to react to comments in this project' })
    }

    const comment = task.comments.id(commentId)
    if (!comment) return res.status(404).json({ message: 'Comment not found' })

    comment.reactions = comment.reactions || []
    const existingIndex = comment.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    )
    if (existingIndex >= 0) {
      comment.reactions.splice(existingIndex, 1)
    } else {
      comment.reactions.push({ user: req.user._id, emoji })
    }
    await task.save()

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'comments.user', select: 'name email avatar' },
      { path: 'sprint', select: 'name startDate endDate' },
      { path: 'blockedBy', select: 'title status' },
      { path: 'timeEntries.user', select: 'name' },
      { path: 'attachments.uploadedBy', select: 'name' },
      { path: 'comments.reactions.user', select: 'name' }
    ])

    req.io?.to(task.project.toString()).emit('task_updated', populated)
    res.json(populated)
  } catch (err) {
    handleControllerError(res, err)
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
    await logActivity({
      projectId: task.project,
      actorId: req.user._id,
      actorName: req.user.name,
      type: 'task_deleted',
      message: `${req.user.name} deleted task "${task.title}"`,
      meta: { taskId: id, title: task.title },
      io: req.io
    })
    res.json({ message: 'Task deleted successfully' })
  } catch (err) {
    handleControllerError(res, err)
  }
}
