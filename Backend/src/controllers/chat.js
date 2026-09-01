import Chat from '../models/chat.js'
import Project from '../models/project.js'
import { handleControllerError } from '../middleware/errorHandler.js'

export const getChatMessages = async (req, res) => {
  try {
    const { projectId } = req.params
    const project = await Project.findById(projectId)
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const isMember = project.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    )
    if (!isMember) return res.status(403).json({ message: 'Not a member of this project' })

    const messages = await Chat.find({ project: projectId })
      .populate('user', 'name email avatar')
      .sort({ createdAt: 1 })
      .limit(100)

    res.json(messages)
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const sendChatMessage = async (req, res) => {
  try {
    const { projectId } = req.params
    const { message } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message text is required' })
    }

    const project = await Project.findById(projectId)
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const isMember = project.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    )
    if (!isMember) return res.status(403).json({ message: 'Not a member of this project' })

    const chatDoc = await Chat.create({
      project: projectId,
      user: req.user._id,
      message: message.trim()
    })

    const populated = await chatDoc.populate('user', 'name email avatar')

    req.io?.to(projectId).emit('new_chat_message', populated)
    res.status(201).json(populated)
  } catch (err) {
    handleControllerError(res, err)
  }
}
