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

// Verify declared MIME type against actual file content instead of trusting
// the client-supplied Content-Type. Text formats have no signature, so they
// are sniffed for NUL bytes (binary content disguised as text is rejected).
const startsWith = (buf, sig) => buf.length >= sig.length && sig.every((b, i) => buf[i] === b)

const OLE2 = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const ZIP_SIG = [0x50, 0x4b, 0x03, 0x04]

const isTextContent = (buf) => {
  const head = buf.subarray(0, 1024)
  for (let i = 0; i < head.length; i++) {
    if (head[i] === 0) return false
  }
  return true
}

const MAGIC_VALIDATORS = {
  'image/png': (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/jpeg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  'image/gif': (b) => startsWith(b, [0x47, 0x49, 0x46, 0x38]),
  'image/webp': (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && b.length >= 12 && startsWith(b.subarray(8), [0x57, 0x45, 0x42, 0x50]),
  'application/pdf': (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]),
  'application/zip': (b) => startsWith(b, ZIP_SIG),
  'application/gzip': (b) => startsWith(b, [0x1f, 0x8b]),
  'application/x-7z-compressed': (b) => startsWith(b, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
  'application/msword': (b) => startsWith(b, OLE2),
  'application/vnd.ms-excel': (b) => startsWith(b, OLE2),
  'application/vnd.ms-powerpoint': (b) => startsWith(b, OLE2),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (b) => startsWith(b, ZIP_SIG),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (b) => startsWith(b, ZIP_SIG),
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': (b) => startsWith(b, ZIP_SIG),
  'text/plain': isTextContent,
  'text/markdown': isTextContent,
  'text/csv': isTextContent
}

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

      const magicOk = MAGIC_VALIDATORS[req.file.mimetype]?.(req.file.buffer)
      if (!magicOk) {
        return res.status(400).json({
          message: 'Uploaded file content does not match its declared type.'
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