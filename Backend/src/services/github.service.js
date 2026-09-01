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

  if (!commits.length) return { syncedCount: 0, commits: [] }

  // Resolve committers for the whole batch first (independent lookups run in parallel).
  const resolved = await Promise.all(
    commits.map((item) => {
      const meta = formatCommitMeta(item, owner, repo)
      const authorObj = item.commit?.author || item.commit?.committer || null
      const rawDate = authorObj?.date ? new Date(authorObj.date) : new Date()
      const commitDate = rawDate <= new Date() ? rawDate : new Date()
      return resolveUserForCommit(project, meta.authorEmail, meta.authorName).then((userId) => ({
        meta,
        userId,
        commitDate
      }))
    })
  )

  // Single batch read of already-synced SHAs instead of one query per commit.
  const existingDocs = await Contribution.find({
    project: projectId,
    'meta.sha': { $in: resolved.map((r) => r.meta.sha) }
  })
  const existingBySha = new Map(existingDocs.map((doc) => [doc.meta.sha, doc]))

  const updateOps = []
  const newDocs = []
  for (const { meta, userId, commitDate } of resolved) {
    const existing = existingBySha.get(meta.sha)
    if (existing) {
      const currentUserIdStr = existing.user ? existing.user.toString() : null
      const correctUserIdStr = userId || null
      if (currentUserIdStr !== correctUserIdStr) {
        updateOps.push({
          updateOne: {
            filter: { _id: existing._id },
            update: { $set: { user: userId ?? null } }
          }
        })
      }
      continue
    }
    newDocs.push({
      project: projectId,
      user: userId || null,
      type: 'commit',
      weight: 4,
      meta,
      createdAt: commitDate
    })
  }

  // Bulk-write re-attributions and insert new commits in single round-trips.
  if (updateOps.length) await Contribution.bulkWrite(updateOps)
  let inserted = []
  if (newDocs.length) inserted = await Contribution.insertMany(newDocs)

  // One fetch populates every affected contribution for socket broadcasts.
  const affectedIds = [
    ...updateOps.map((op) => op.updateOne.filter._id),
    ...inserted.map((doc) => doc._id)
  ]
  let affectedDocs = []
  if (affectedIds.length) {
    affectedDocs = await Contribution.find({ _id: { $in: affectedIds } })
      .populate('user', 'name email avatar statusText')
  }
  const docsById = new Map(affectedDocs.map((doc) => [doc._id.toString(), doc]))
  const updateIdSet = new Set(updateOps.map((op) => op.updateOne.filter._id.toString()))

  let syncedCount = 0
  const syncedContribs = []
  for (const { meta } of resolved) {
    const existing = existingBySha.get(meta.sha)
    if (existing) {
      const populated = docsById.get(existing._id.toString())
      if (populated && updateIdSet.has(existing._id.toString())) {
        syncedContribs.push(populated)
        syncedCount++
        io?.to(projectId).emit('contribution_updated', populated)
      }
      continue
    }
    const createdDoc = newDocs.find((d) => d.meta?.sha === meta.sha)
    const populated = createdDoc ? docsById.get(createdDoc._id.toString()) : undefined
    if (populated) {
      syncedContribs.push(populated)
      syncedCount++
      io?.to(projectId).emit('new_contribution', populated)
    }
  }

  // Snapshot increments for any newly created commits run in parallel.
  if (newDocs.length) {
    await Promise.all(
      newDocs
        .filter((doc) => doc.user)
        .map((doc) => upsertDaySnapshot({ projectId, userId: doc.user, date: doc.createdAt, weight: 4 }))
    )
  }

  return { syncedCount, commits: syncedContribs }
}