import express from 'express'
import { protect } from '../middleware/auth.js'
import {
  getSprints,
  createSprint,
  updateSprint,
  deleteSprint,
  getBurndown
} from '../controllers/sprint.js'

const router = express.Router()

router.use(protect)

router.get('/project/:projectId', getSprints)
router.post('/project/:projectId', createSprint)
router.get('/:id/burndown', getBurndown)
router.patch('/:id', updateSprint)
router.delete('/:id', deleteSprint)

export default router