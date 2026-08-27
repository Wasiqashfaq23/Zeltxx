import express from 'express'
import { protect } from '../middleware/auth.js'
import { getNotifications, markAsRead, markAllAsRead, respondToInviteNotification } from '../controllers/notifications.js'

const router = express.Router()

router.use(protect)

router.get('/', getNotifications)
router.patch('/read-all', markAllAsRead)
router.patch('/:id/read', markAsRead)
router.post('/:id/respond', respondToInviteNotification)

export default router
