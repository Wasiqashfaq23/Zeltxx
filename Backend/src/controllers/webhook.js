import Contribution from '../models/contribution.js'
import Project from '../models/project.js'
import User from '../models/user.js'
import Snapshot from '../models/snapshot.js'

export const handleGitHubWebhook = async (req, res) => {
  try {
    const { projectId } = req.params
    const { event, authorName, authorEmail, meta, type } = req.body

    const project = await Project.findById(projectId).populate('members.user', 'name email avatar')
    if (!project) return res.status(404).json({ message: 'Project not found' })

    // Resolve actual committer user ID by authorEmail or authorName
    let userId = null

    if (authorEmail) {
      const emailLower = authorEmail.toLowerCase().trim()
      const emailMatch = project.members.find((m) => m.user?.email?.toLowerCase().trim() === emailLower)
      if (emailMatch?.user) {
        userId = emailMatch.user._id || emailMatch.user
      } else {
        const userByEmail = await User.findOne({ email: emailLower })
        if (userByEmail) userId = userByEmail._id
      }
    } else if (authorName) {
      const nameLower = authorName.toLowerCase().trim()
      const nameMatch = project.members.find((m) => {
        const memberName = (m.user?.name || '').toLowerCase().trim()
        return memberName === nameLower || memberName.includes(nameLower)
      })
      if (nameMatch?.user) {
        userId = nameMatch.user._id || nameMatch.user
      } else {
        const userByName = await User.findOne({ name: new RegExp(`^${authorName.trim()}$`, 'i') })
        if (userByName) userId = userByName._id
      }
    }

    const contribType = type || (event === 'pull_request' ? 'review' : 'commit')
    const contribMeta = meta || {
      commitMsg: `GitHub Webhook Event: ${event || 'push'}`,
      authorName: authorName || 'GitHub Committer',
      authorEmail: authorEmail || ''
    }
    const weight = contribType === 'commit' ? 4 : 3

    const contrib = await Contribution.create({
      project: projectId,
      user: userId,
      type: contribType,
      weight,
      meta: contribMeta
    })

    const populated = await contrib.populate('user', 'name email avatar statusText')

    // Update daily snapshot for committer if member
    if (userId) {
      const todayStr = new Date().toISOString().split('T')[0]
      await Snapshot.findOneAndUpdate(
        { project: projectId, user: userId, date: new Date(todayStr) },
        {
          $inc: { totalCount: 1, totalWeight: weight },
          $set: { project: projectId, user: userId, date: new Date(todayStr) }
        },
        { upsert: true, returnDocument: 'after' }
      )
    }

    req.io?.to(projectId).emit('new_contribution', populated)
    res.status(201).json({ message: 'Webhook processed successfully', contribution: populated })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
