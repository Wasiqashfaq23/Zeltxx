import Project from '../models/project.js'
import Contribution from '../models/contribution.js'
import Snapshot from '../models/snapshot.js'

/**
 * Parses GitHub repo owner and name from formats:
 * - "https://github.com/owner/repo"
 * - "owner/repo"
 */
function parseRepoOwnerAndName(input) {
  if (!input) return null
  const cleaned = input.trim().replace(/\/$/, '')
  if (cleaned.includes('github.com/')) {
    const parts = cleaned.split('github.com/')[1].split('/')
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
  } else if (cleaned.includes('/')) {
    const parts = cleaned.split('/')
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
  }
  return null
}

export const syncGitHubCommits = async (req, res) => {
  try {
    const { projectId } = req.params
    const { repoUrl, personalAccessToken } = req.body

    const repoInfo = parseRepoOwnerAndName(repoUrl)
    if (!repoInfo) {
      return res.status(400).json({ message: 'Invalid GitHub repository URL or format. Use "owner/repo" or "https://github.com/owner/repo".' })
    }

    const project = await Project.findById(projectId)
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const { owner, repo } = repoInfo
    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=15`

    const headers = {
      'User-Agent': 'Zeltxx-App',
      'Accept': 'application/vnd.github.v3+json'
    }

    if (personalAccessToken) {
      headers['Authorization'] = `token ${personalAccessToken}`
    }

    console.log(`🌐 Fetching real commits from GitHub API: ${githubApiUrl}`)
    const response = await fetch(githubApiUrl, { headers })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        message: errData.message || `GitHub API error: ${response.statusText}`
      })
    }

    const githubCommits = await response.json()
    if (!Array.isArray(githubCommits) || githubCommits.length === 0) {
      return res.status(200).json({ message: 'No commits found in the repository.', syncedCount: 0 })
    }

    const firstMember = project.members[0]?.user
    const currentUserId = req.user?._id || firstMember

    let syncedCount = 0
    const syncedContribs = []

    for (const item of githubCommits) {
      const sha = item.sha
      const commitObj = item.commit || {}
      const authorObj = commitObj.author || {}
      const message = commitObj.message || 'GitHub Commit'
      const commitDate = authorObj.date ? new Date(authorObj.date) : new Date()

      // Format meta
      const meta = {
        commitMsg: message.split('\n')[0],
        sha: sha.substring(0, 7),
        authorName: authorObj.name || 'GitHub Author',
        authorEmail: authorObj.email || '',
        url: item.html_url || `https://github.com/${owner}/${repo}/commit/${sha}`
      }

      // Check if commit already logged for this project
      const existing = await Contribution.findOne({
        project: projectId,
        'meta.sha': meta.sha
      })

      if (!existing) {
        const contrib = await Contribution.create({
          project: projectId,
          user: currentUserId,
          type: 'commit',
          weight: 4,
          meta,
          createdAt: commitDate
        })

        const populated = await contrib.populate('user', 'name email avatar statusText')
        syncedContribs.push(populated)
        syncedCount++

        // Broadcast over Socket.io
        req.io?.to(projectId).emit('new_contribution', populated)

        // Update daily snapshot
        const dateStr = commitDate.toISOString().split('T')[0]
        await Snapshot.findOneAndUpdate(
          { project: projectId, user: currentUserId, date: new Date(dateStr) },
          {
            $inc: { totalCount: 1, totalWeight: 4 },
            $set: { project: projectId, user: currentUserId, date: new Date(dateStr) }
          },
          { upsert: true, returnDocument: 'after' }
        )
      }
    }

    return res.status(200).json({
      message: `Successfully synced ${syncedCount} new GitHub commit(s) from ${owner}/${repo}!`,
      syncedCount,
      commits: syncedContribs
    })
  } catch (err) {
    console.error('GitHub Sync Error:', err)
    return res.status(500).json({ message: err.message || 'Failed to sync GitHub commits' })
  }
}
