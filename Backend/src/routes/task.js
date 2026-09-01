import express from 'express'
import { protect } from '../middleware/auth.js'
import {
  getTasks,
  createTask,
  updateTask,
  addSubtask,
  toggleSubtask,
  addTaskComment,
  deleteTask,
  trackTaskTime,
  toggleTaskCommentReaction
} from '../controllers/task.js'
import {
  uploadTaskAttachment,
  deleteTaskAttachment
} from '../controllers/taskAttachment.js'

const router = express.Router()

router.get('/project/:projectId', protect, getTasks)
router.post('/project/:projectId', protect, createTask)
router.put('/:id', protect, updateTask)
router.post('/:id/subtasks', protect, addSubtask)
router.patch('/:id/subtasks/:subtaskId', protect, toggleSubtask)
router.post('/:id/comments', protect, addTaskComment)
router.patch('/:id/comments/:commentId/reactions', protect, toggleTaskCommentReaction)
router.post('/:id/time', protect, trackTaskTime)
router.post('/:id/attachments', protect, uploadTaskAttachment)
router.delete('/:id/attachments/:attId', protect, deleteTaskAttachment)
router.delete('/:id', protect, deleteTask)

export default router
