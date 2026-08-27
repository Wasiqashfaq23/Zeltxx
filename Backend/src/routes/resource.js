import express from 'express'
import { protect } from '../middleware/auth.js'
import { getResources, createResource, deleteResource } from '../controllers/resource.js'

const router = express.Router()

router.get('/project/:projectId', protect, getResources)
router.post('/project/:projectId', protect, createResource)
router.delete('/:id', protect, deleteResource)

export default router
