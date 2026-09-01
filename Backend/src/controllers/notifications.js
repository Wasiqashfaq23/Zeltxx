import Notification from '../models/notification.js'
import Project from '../models/project.js'
import { handleControllerError } from '../middleware/errorHandler.js'

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(20)

    const safeNotifications = notifications.map((notification) => ({
      ...notification.toObject(),
      message: typeof notification.message === 'string' ? notification.message : ''
    }))

    res.json(safeNotifications)
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const markAsRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true }
    )
    res.json({ message: 'Marked as read' })
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    )
    res.json({ message: 'All marked as read' })
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const respondToInviteNotification = async (req, res) => {
  try {
    const { id } = req.params
    const { action } = req.body // 'accept' or 'reject'

    const notification = await Notification.findOne({ _id: id, user: req.user._id })
    if (!notification) return res.status(404).json({ message: 'Notification not found' })

    if (notification.type !== 'project_invite') {
      return res.status(400).json({ message: 'Only project invitations can be responded to' })
    }
    if (notification.status !== 'pending') {
      return res.status(400).json({ message: 'This invitation has already been responded to' })
    }

    if (action === 'accept') {
      const projectDoc = await Project.findById(notification.project)
      if (projectDoc) {
        const alreadyMember = projectDoc.members.some(
          (m) => (m.user._id || m.user).toString() === req.user._id.toString()
        )
        if (!alreadyMember) {
          projectDoc.members.push({ user: req.user._id, role: notification.role || 'collaborator' })
          await projectDoc.save()
        }
      }
      notification.status = 'accepted'
      notification.read = true
      await notification.save()

      const populated = await Notification.findById(id).populate('project', 'name')
      return res.json({ message: 'Accepted invitation successfully', notification: populated })
    } else {
      notification.status = 'rejected'
      notification.read = true
      await notification.save()

      const populated = await Notification.findById(id).populate('project', 'name')
      return res.json({ message: 'Rejected invitation', notification: populated })
    }
  } catch (err) {
    handleControllerError(res, err)
  }
}
