import Resource from '../models/resource.js'
import Project from '../models/project.js'
import Contribution from '../models/contribution.js'

export const getResources = async (req, res) => {
  try {
    const { projectId } = req.params
    const project = await Project.findById(projectId)
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const isMember = project.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    )
    if (!isMember) return res.status(403).json({ message: 'Not a member of this project' })

    const resources = await Resource.find({ project: projectId })
      .populate('addedBy', 'name email avatar')
      .sort({ createdAt: -1 })

    res.json(resources)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const createResource = async (req, res) => {
  try {
    const { projectId } = req.params
    const { title, url, category } = req.body

    if (!title || !url) {
      return res.status(400).json({ message: 'Title and URL are required' })
    }

    const project = await Project.findById(projectId)
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const isMember = project.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    )
    if (!isMember) return res.status(403).json({ message: 'Not a member of this project' })

    const resource = await Resource.create({
      title,
      url,
      category: category || 'other',
      project: projectId,
      addedBy: req.user._id
    })

    const populated = await resource.populate('addedBy', 'name email avatar')

    // Auto-log file_upload contribution point
    const contrib = await Contribution.create({
      project: projectId,
      user: req.user._id,
      type: 'file_upload',
      weight: 2,
      meta: `Added resource: "${title}"`
    })
    const populatedContrib = await contrib.populate('user', 'name email avatar')
    req.io?.to(projectId).emit('new_contribution', populatedContrib)

    req.io?.to(projectId).emit('resource_added', populated)
    res.status(201).json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params
    const resource = await Resource.findById(id)
    if (!resource) return res.status(404).json({ message: 'Resource not found' })

    const projectId = resource.project.toString()
    await Resource.findByIdAndDelete(id)

    req.io?.to(projectId).emit('resource_deleted', id)
    res.json({ message: 'Resource deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
