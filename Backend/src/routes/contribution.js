import express from 'express'
import { protect } from "../middleware/auth.js"
import { logContribution, getContribution, getProjectSummary } from "../controllers/contribution.js"

const router = express.Router()

router.use(protect)

router.post('/', logContribution)
router.get("/:projectId", getContribution)
router.get('/:projectId/summary', getProjectSummary)


export default router