import express from 'express'
import { protect } from '../middleware/auth.js'
import {
  getTasks,
  createTask,
  updateTask,
  addSubtask,
  toggleSubtask,
  addTaskComment,
  deleteTask
} from '../controllers/task.js'

const router = express.Router()

router.get('/project/:projectId', protect, getTasks)
router.post('/project/:projectId', protect, createTask)
router.put('/:id', protect, updateTask)
router.post('/:id/subtasks', protect, addSubtask)
router.patch('/:id/subtasks/:subtaskId', protect, toggleSubtask)
router.post('/:id/comments', protect, addTaskComment)
router.delete('/:id', protect, deleteTask)

export default router
