import express from 'express'
import { protect } from '../middleware/auth.js'
import { getSnapshots, getSnapshotsByRange } from '../controllers/snapshot.js'

const router = express.Router()

router.use(protect)

router.get('/:projectId',       getSnapshots)
router.get('/:projectId/range', getSnapshotsByRange)

export default router