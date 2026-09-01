import Contribution from '../models/contribution.js'
import User from '../models/user.js'
import { upsertDaySnapshot } from './snapshot.service.js'

/**
 * Parses GitHub repo owner and name from formats:
 * - "https://github.com/owner/repo"
 * - "owner/repo"
 */
export const parseRepoOwnerAndName = (input) => {
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

const normalize = (value) => (value || '').toLowerCase().trim()

const userIdOf = (memberOrUser) =>
  memberOrUser?._id ? memberOrUser._id.toString() : memberOrUser ? memberOrUser.toString() : null

/**
 * Resolves a GitHub committer to an app user using strict, exact matching.
 * Never builds regex from untrusted author data (avoids regex injection / ReDoS).
 */
export const resolveUserForCommit = async (project, authorEmail, authorName) => {
  try {
    if (authorEmail) {
      const emailLower = normalize(authorEmail)
      const emailMatch = project.members.find((m) => normalize(m.user?.email) === emailLower)
      if (userIdOf(emailMatch?.user)) return userIdOf(emailMatch.user)
      const userByEmail = await User.findOne({ email: emailLower })
      if (userByEmail) return userByEmail._id.toString()
      return null
    }

    if (authorName) {
      const nameLower = normalize(authorName)
      const nameMatch = project.members.find((m) => normalize(m.user?.name) === nameLower)
      if (userIdOf(nameMatch?.user)) return userIdOf(nameMatch.user)

      const userByName = await User.findOne({ name: nameLower })
      if (userByName) return userByName._id.toString()
    }
  } catch (err) {
    console.error('Error resolving committer user:', err)
  }
  return null
}

export const fetchCommitBatch = async (owner, repo, personalAccessToken) => {
  const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=20`
  const headers = {
    'User-Agent': 'Zeltxx-App',
    Accept: 'application/vnd.github.v3+json'
  }
  if (personalAccessToken) headers.Authorization = `token ${personalAccessToken}`

  const response = await fetch(githubApiUrl, { headers })
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    const error = new Error(errData.message || `GitHub API error: ${response.statusText}`)
    error.status = response.status
    throw error
  }
  const commits = await response.json()
  if (!Array.isArray(commits)) return []
  return commits
}

const formatCommitMeta = (item, owner, repo) => {
  const commitObj = item.commit || {}
  const authorObj = commitObj.author || commitObj.committer || item.author || {}
  const sha = item.sha || ''
  return {
    commitMsg: (commitObj.message || 'GitHub Commit').split('\n')[0],
    sha: sha.substring(0, 7),
    authorName: authorObj.name || item.author?.login || 'GitHub Author',
    authorEmail: authorObj.email || commitObj.committer?.email || '',
    url: item.html_url || `https://github.com/${owner}/${repo}/commit/${sha}`
  }
}

/**
 * Syncs a batch of GitHub commits into a project via the guarded contribution
 * path: existing commits are re-attributed when the committer resolves, new
 * commits are created and counted into daily snapshots.
 */
export const syncCommitsIntoProject = async ({ project, commits, owner, repo, io }) => {
  const projectId = project._id.toString()
  let syncedCount = 0
  const syncedContribs = []

  for (const item of commits) {
    const meta = formatCommitMeta(item, owner, repo)
    const authorObj = item.commit?.author || item.commit?.committer || null
    const commitDate = authorObj?.date ? new Date(authorObj.date) : new Date()

    const committerUserId = await resolveUserForCommit(project, meta.authorEmail, meta.authorName)

    const existing = await Contribution.findOne({
      project: projectId,
      'meta.sha': meta.sha
    })

    if (existing) {
      const currentUserIdStr = existing.user ? existing.user.toString() : null
      const correctUserIdStr = committerUserId || null

      if (currentUserIdStr !== correctUserIdStr) {
        existing.user = committerUserId
        await existing.save()
        const populated = await existing.populate('user', 'name email avatar statusText')
        syncedContribs.push(populated)
        syncedCount++
        io?.to(projectId).emit('contribution_updated', populated)
      }
      continue
    }

    const contribution = await Contribution.create({
      project: projectId,
      user: committerUserId || null,
      type: 'commit',
      weight: 4,
      meta,
      createdAt: commitDate <= new Date() ? commitDate : new Date()
    })
    const populated = await contribution.populate('user', 'name email avatar statusText')
    syncedContribs.push(populated)
    syncedCount++
    io?.to(projectId).emit('new_contribution', populated)

    if (committerUserId) {
      await upsertDaySnapshot({ projectId, userId: committerUserId, date: commitDate, weight: 4 })
    }
  }

  return { syncedCount, commits: syncedContribs }
}