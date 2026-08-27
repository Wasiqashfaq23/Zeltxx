import Contribution from '../models/contribution.js'
import Project from '../models/project.js'

export const handleGitHubWebhook = async (req, res) => {
  try {
    const { projectId } = req.params
    const { event, authorName, authorEmail, meta, type } = req.body

    const project = await Project.findById(projectId)
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const firstMember = project.members[0]?.user
    const userId = req.user?._id || firstMember || null

    if (!userId) {
      return res.status(400).json({ message: 'No valid user for contribution' })
    }

    const contribType = type || (event === 'pull_request' ? 'review' : 'commit')
    const contribMeta = meta || `GitHub Webhook Event: ${event || 'push'} by ${authorName || 'Developer'}`

    const contrib = await Contribution.create({
      project: projectId,
      user: userId,
      type: contribType,
      weight: contribType === 'commit' ? 4 : 3,
      meta: contribMeta
    })

    const populated = await contrib.populate('user', 'name email avatar statusText')

    req.io?.to(projectId).emit('new_contribution', populated)
    res.status(201).json({ message: 'Webhook processed successfully', contribution: populated })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
