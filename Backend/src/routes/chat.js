import express from 'express'
import { protect } from '../middleware/auth.js'
import { getChatMessages, sendChatMessage } from '../controllers/chat.js'

const router = express.Router()

router.get('/project/:projectId', protect, getChatMessages)
router.post('/project/:projectId', protect, sendChatMessage)

export default router
