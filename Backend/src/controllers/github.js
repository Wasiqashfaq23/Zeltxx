import Project from '../models/project.js'
import Contribution from '../models/contribution.js'
import Snapshot from '../models/snapshot.js'
import User from '../models/user.js'

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

/**
 * Smart helper: Matches GitHub commit author email/name to a user in DB
 */
async function resolveUserForCommit(project, authorEmail, authorName, fallbackUserId) {
  try {
    // 1. Try matching by email in populated project members
    if (authorEmail) {
      const emailLower = authorEmail.toLowerCase().trim()
      const emailMatch = project.members.find((m) => m.user?.email?.toLowerCase().trim() === emailLower)
      if (emailMatch?.user) return emailMatch.user._id || emailMatch.user
    }

    // 2. Try matching by name in populated project members
    if (authorName) {
      const nameLower = authorName.toLowerCase().trim()
      const nameMatch = project.members.find((m) => {
        const memberName = (m.user?.name || '').toLowerCase().trim()
        return memberName === nameLower || memberName.includes(nameLower) || nameLower.includes(memberName)
      })
      if (nameMatch?.user) return nameMatch.user._id || nameMatch.user
    }

    // 3. Check global User collection by email
    if (authorEmail) {
      const userByEmail = await User.findOne({ email: authorEmail.toLowerCase().trim() })
      if (userByEmail) return userByEmail._id
    }

    // 4. Check global User collection by name
    if (authorName) {
      const userByName = await User.findOne({ name: new RegExp(`^${authorName.trim()}$`, 'i') })
      if (userByName) return userByName._id
    }
  } catch (err) {
    console.error('Error resolving committer user:', err)
  }

  // Fallback to the person who triggered sync if no matching committer account was found
  return fallbackUserId
}

/**
 * Internal helper to sync GitHub commits directly for auto-sync on project creation/update
 */
export const syncGitHubCommitsInternal = async (projectId, repoUrl, triggerUserId, io) => {
  const repoInfo = parseRepoOwnerAndName(repoUrl)
  if (!repoInfo) return { syncedCount: 0 }

  const project = await Project.findById(projectId).populate('members.user', 'name email avatar')
  if (!project) return { syncedCount: 0 }

  const { owner, repo } = repoInfo
  const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=20`

  const response = await fetch(githubApiUrl, {
    headers: { 'User-Agent': 'Zeltxx-App', 'Accept': 'application/vnd.github.v3+json' }
  })
  if (!response.ok) return { syncedCount: 0 }

  const githubCommits = await response.json()
  if (!Array.isArray(githubCommits)) return { syncedCount: 0 }

  const fallbackUserId = triggerUserId || project.members[0]?.user?._id
  let syncedCount = 0
  const syncedContribs = []

  for (const item of githubCommits) {
    const sha = item.sha
    const commitObj = item.commit || {}
    const authorObj = commitObj.author || {}
    const message = commitObj.message || 'GitHub Commit'
    const commitDate = authorObj.date ? new Date(authorObj.date) : new Date()

    const meta = {
      commitMsg: message.split('\n')[0],
      sha: sha.substring(0, 7),
      authorName: authorObj.name || 'GitHub Author',
      authorEmail: authorObj.email || '',
      url: item.html_url || `https://github.com/${owner}/${repo}/commit/${sha}`
    }

    const committerUserId = await resolveUserForCommit(project, meta.authorEmail, meta.authorName, fallbackUserId)

    const existing = await Contribution.findOne({
      project: projectId,
      'meta.sha': meta.sha
    })

    if (!existing) {
      const contrib = await Contribution.create({
        project: projectId,
        user: committerUserId,
        type: 'commit',
        weight: 4,
        meta,
        createdAt: commitDate
      })

      const populated = await contrib.populate('user', 'name email avatar statusText')
      syncedContribs.push(populated)
      syncedCount++

      io?.to(projectId.toString()).emit('new_contribution', populated)

      const dateStr = commitDate.toISOString().split('T')[0]
      await Snapshot.findOneAndUpdate(
        { project: projectId, user: committerUserId, date: new Date(dateStr) },
        {
          $inc: { totalCount: 1, totalWeight: 4 },
          $set: { project: projectId, user: committerUserId, date: new Date(dateStr) }
        },
        { upsert: true, returnDocument: 'after' }
      )
    }
  }

  return { syncedCount, commits: syncedContribs }
}

export const syncGitHubCommits = async (req, res) => {
  try {
    const { projectId } = req.params
    const { repoUrl, personalAccessToken } = req.body

    const repoInfo = parseRepoOwnerAndName(repoUrl)
    if (!repoInfo) {
      return res.status(400).json({ message: 'Invalid GitHub repository URL or format. Use "owner/repo" or "https://github.com/owner/repo".' })
    }

    const project = await Project.findById(projectId).populate('members.user', 'name email avatar')
    if (!project) return res.status(404).json({ message: 'Project not found' })

    const { owner, repo } = repoInfo
    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=20`

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

    const fallbackUserId = req.user?._id || project.members[0]?.user?._id

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

      // Resolve the actual committer user ID based on authorEmail / authorName!
      const committerUserId = await resolveUserForCommit(project, meta.authorEmail, meta.authorName, fallbackUserId)

      // Check if commit already logged for this project
      const existing = await Contribution.findOne({
        project: projectId,
        'meta.sha': meta.sha
      })

      if (!existing) {
        const contrib = await Contribution.create({
          project: projectId,
          user: committerUserId,
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

        // Update daily snapshot for the committer
        const dateStr = commitDate.toISOString().split('T')[0]
        await Snapshot.findOneAndUpdate(
          { project: projectId, user: committerUserId, date: new Date(dateStr) },
          {
            $inc: { totalCount: 1, totalWeight: 4 },
            $set: { project: projectId, user: committerUserId, date: new Date(dateStr) }
          },
          { upsert: true, returnDocument: 'after' }
        )
      }
    }

    return res.status(200).json({
      message: `Successfully synced ${syncedCount} new GitHub commit(s) from ${owner}/${repo}! Attributed commits to matching author accounts.`,
      syncedCount,
      commits: syncedContribs
    })
  } catch (err) {
    console.error('GitHub Sync Error:', err)
    return res.status(500).json({ message: err.message || 'Failed to sync GitHub commits' })
  }
}
