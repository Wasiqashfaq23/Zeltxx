import express from 'express'
import { syncGitHubCommits } from '../controllers/github.js'

const router = express.Router()

router.post('/sync/:projectId', syncGitHubCommits)

export default router
