import Notification from '../models/notification.js'

/**
 * Creates a notification document and live-pushes it to the recipient's
 * personal socket room (`user_<id>`). Returns the populated notification.
 */
export const createNotification = async (io, { userId, type, message, project, data = {} }) => {
  if (!userId) return null
  const notification = await Notification.create({ user: userId, type, message, project, ...data })
  const populated = await notification.populate('project', 'name')
  if (io) io.to(`user_${String(userId)}`).emit('notification', populated)
  return populated
}