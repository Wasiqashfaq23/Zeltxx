import Project from '../models/project.js'
import { parseRepoOwnerAndName, fetchCommitBatch, syncCommitsIntoProject } from '../services/github.service.js'
import { isMember } from '../services/membership.js'
import { handleControllerError } from '../middleware/errorHandler.js'

/**
 * Internal helper used on project create/update for background auto-sync.
 */
export const syncGitHubCommitsInternal = async (projectId, repoUrl, triggerUserId, io) => {
  const repoInfo = parseRepoOwnerAndName(repoUrl)
  if (!repoInfo) return { syncedCount: 0 }

  const project = await Project.findById(projectId).populate('members.user', 'name email avatar')
  if (!project || !project.isActive) return { syncedCount: 0 }

  const { owner, repo } = repoInfo
  const commits = await fetchCommitBatch(owner, repo)
  if (!commits.length) return { syncedCount: 0 }

  return syncCommitsIntoProject({ project, commits, owner, repo, io })
}

export const syncGitHubCommits = async (req, res, _next) => {
  try {
    const { projectId } = req.params
    const { repoUrl, personalAccessToken } = req.body

    const repoInfo = parseRepoOwnerAndName(repoUrl)
    if (!repoInfo) {
      return res.status(400).json({ message: 'Invalid GitHub repository URL or format. Use "owner/repo" or "https://github.com/owner/repo".' })
    }

    const project = await Project.findById(projectId).populate('members.user', 'name email avatar')
    if (!project) return res.status(404).json({ message: 'Project not found' })
    if (!req.user?._id || !isMember(project, req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this project.' })
    }

    const { owner, repo } = repoInfo
    console.log(`🌐 Fetching real commits from GitHub API: ${owner}/${repo}`)
    const commits = await fetchCommitBatch(owner, repo, personalAccessToken)
    if (!commits.length) {
      return res.status(200).json({ message: 'No commits found in the repository.', syncedCount: 0 })
    }

    const result = await syncCommitsIntoProject({ project, commits, owner, repo, io: req.io, personalAccessToken })

    return res.status(200).json({
      message: `Successfully synced/re-attributed ${result.syncedCount} GitHub commit(s) from ${owner}/${repo}!`,
      syncedCount: result.syncedCount,
      commits: result.commits
    })
  } catch (err) {
    console.error('GitHub Sync Error:', err)
    return handleControllerError(res, err)
  }
}