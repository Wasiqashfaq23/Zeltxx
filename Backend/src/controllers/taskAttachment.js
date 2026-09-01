import multer from 'multer'
import Task from '../models/task.js'
import Project from '../models/project.js'
import { uploadToStorage, deleteFromStorage } from '../services/storage.service.js'
import { handleControllerError } from '../middleware/errorHandler.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/zip',
  'application/gzip',
  'application/x-7z-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
])

async function verifyProjectMember(projectId, userId) {
  const project = await Project.findById(projectId)
  if (!project || !project.isActive) return false
  return project.members.some((m) => m.user.toString() === userId.toString())
}

const populatedList = [
  { path: 'assignedTo', select: 'name email avatar' },
  { path: 'createdBy', select: 'name email avatar' },
  { path: 'comments.user', select: 'name email avatar' },
  { path: 'sprint', select: 'name startDate endDate' },
  { path: 'blockedBy', select: 'title status' },
  { path: 'timeEntries.user', select: 'name' },
  { path: 'attachments.uploadedBy', select: 'name' },
  { path: 'comments.reactions.user', select: 'name' }
]

export const uploadTaskAttachment = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { id } = req.params
      const task = await Task.findById(id)
      if (!task) return res.status(404).json({ message: 'Task not found' })

      const isMember = await verifyProjectMember(task.project, req.user._id)
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to attach files in this project' })
      }

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: 'No file uploaded' })
      }

      if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
        return res.status(400).json({
          message: 'File type not allowed (images, PDF, text, and archives only).'
        })
      }

      const stored = await uploadToStorage({
        buffer: req.file.buffer,
        filename: req.file.originalname
      })

      task.attachments.push({
        name: String(req.file.originalname || 'attachment').slice(0, 200),
        url: stored.url,
        publicId: stored.publicId || '',
        mimeType: req.file.mimetype || '',
        size: req.file.size || 0,
        uploadedBy: req.user._id
      })
      await task.save()

      const populated = await task.populate(populatedList)
      req.io?.to(task.project.toString()).emit('task_updated', populated)
      res.status(201).json(populated)
    } catch (err) {
      handleControllerError(res, err)
    }
  }
]

export const deleteTaskAttachment = async (req, res) => {
  try {
    const { id, attId } = req.params
    const task = await Task.findById(id)
    if (!task) return res.status(404).json({ message: 'Task not found' })

    const isMember = await verifyProjectMember(task.project, req.user._id)
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to modify files in this project' })
    }

    const attachment = task.attachments.id(attId)
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' })

    await deleteFromStorage({ publicId: attachment.publicId, url: attachment.url })
    task.attachments.pull(attId)
    await task.save()

    const populated = await task.populate(populatedList)
    req.io?.to(task.project.toString()).emit('task_updated', populated)
    res.json(populated)
  } catch (err) {
    handleControllerError(res, err)
  }
}