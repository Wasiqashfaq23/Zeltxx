import Notification from '../models/notification.js'

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(20)

    res.json(notifications)
  } catch (err) {
    res.status(500).json({ message: err.message })
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
    res.status(500).json({ message: err.message })
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
    res.status(500).json({ message: err.message })
  }
}
