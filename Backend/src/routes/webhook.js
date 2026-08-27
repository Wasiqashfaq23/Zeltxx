import express from 'express'
import { handleGitHubWebhook } from '../controllers/webhook.js'

const router = express.Router()

router.post('/github/:projectId', handleGitHubWebhook)

export default router
