import express from 'express'
import { protect } from "../middleware/auth.js"
import { logContribution, getContribution, getProjectSummary, getProjectStreaks, getWorkspaceLeaderboard, toggleReaction, exportProjectContributions } from "../controllers/contribution.js"

const router = express.Router()

router.use(protect)

router.post('/', logContribution)
router.get("/workspace/leaderboard", getWorkspaceLeaderboard)
router.get("/:projectId/export", exportProjectContributions)
router.get("/:projectId", getContribution)
router.get('/:projectId/summary', getProjectSummary)
router.get('/:projectId/streak', getProjectStreaks)
router.post('/:id/react', toggleReaction)

export default router