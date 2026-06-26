import express from 'express'
import { protect } from "../middleware/auth.js"
import Project from "../models/project.js"
import { ProjectRole } from "../middleware/roleGuard.js"
import { createProject, getProjects, getProjectById, updateProject, deleteProject, inviteMember, removeMember } from "../controllers/project.js"
const router = express.Router()

const attachProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: 'Project not found' })
    req.project = project
    next()
  } catch {
    res.status(400).json({ message: 'Invalid Project ID' })
  }
}

router.use(protect)

router.post('/',        createProject)
router.get('/',         getProjects)
router.get('/:id',      getProjectById)
router.patch('/:id',    attachProject, ProjectRole('admin'), updateProject)
router.delete('/:id',   attachProject, ProjectRole('admin'), deleteProject)
router.post('/:id/invite',              attachProject, ProjectRole('admin'), inviteMember)
router.delete('/:id/remove/:userId',    attachProject, ProjectRole('admin'), removeMember)

export default router  