import express from 'express'
import { protect } from '../middleware/auth.js'
import { syncGitHubCommits } from '../controllers/github.js'

const router = express.Router()

router.post('/sync/:projectId', protect, syncGitHubCommits)

export default router
