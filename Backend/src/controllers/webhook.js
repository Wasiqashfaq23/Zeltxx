import Project from '../models/project.js'
import { WEIGHTS, WEBHOOK_EVENT_TYPES } from '../config/constants.js'
import { logContributionEvent, sanitizeMeta } from '../services/contribution.service.js'
import { resolveUserForCommit } from '../services/github.service.js'

// contribution type -> webhook event category (toggle knob for admins).
const TYPE_TO_CATEGORY = {
  commit: 'push',
  pr_opened: 'pr',
  pr_merged: 'pr',
  issues_opened: 'issues',
  issues_closed: 'issues',
  review: 'review'
}

/**
 * Maps a raw GitHub webhook (event name + payload) to a Zeltxx contribution
 * descriptor. Returns null for noisy/inconsequential events (e.g. PR
 * synchronize) that should not be scored.
 */
const classifyEvent = (event, body) => {
  if (event === 'push' || Array.isArray(body.commits)) {
    const commit = (body.commits && body.commits[0]) || {}
    const authorName = commit.author?.name || body.pusher?.name || 'GitHub Committer'
    const authorEmail = commit.author?.email || commit.committer?.email || ''
    const rawMeta = body.meta
    const meta =
      rawMeta && typeof rawMeta === 'object'
        ? rawMeta
        : {
            commitMsg: typeof rawMeta === 'string' && rawMeta ? rawMeta : (commit.message || 'GitHub Commit').split('\n')[0],
            sha: commit.id ? commit.id.slice(0, 7) : '',
            authorName,
            authorEmail,
            url: commit.url || body.repository?.html_url || ''
          }
    return { type: 'commit', authorName, authorEmail, meta }
  }

  if (event === 'pull_request' && body.pull_request) {
    const pr = body.pull_request
    const action = body.action || ''
    if (action === 'closed' && pr.merged) {
      return {
        type: 'pr_merged',
        authorName: pr.user?.login || body.sender?.login || '',
        authorEmail: '',
        meta: {
          note: `Merged PR #${pr.number}: ${pr.title || ''}`.slice(0, 200),
          number: pr.number,
          action: 'merged',
          title: pr.title || '',
          url: pr.html_url || ''
        }
      }
    }
    if (['opened', 'reopened', 'ready_for_review'].includes(action)) {
      return {
        type: 'pr_opened',
        authorName: pr.user?.login || body.sender?.login || '',
        authorEmail: '',
        meta: {
          note: `Opened PR #${pr.number}: ${pr.title || ''}`.slice(0, 200),
          number: pr.number,
          action: 'opened',
          title: pr.title || '',
          url: pr.html_url || ''
        }
      }
    }
    return null
  }

  if (event === 'issues' && body.issue) {
    const issue = body.issue
    const action = body.action || ''
    if (action === 'opened') {
      return {
        type: 'issues_opened',
        authorName: issue.user?.login || body.sender?.login || '',
        authorEmail: '',
        meta: {
          note: `Opened issue #${issue.number}: ${issue.title || ''}`.slice(0, 200),
          number: issue.number,
          action: 'opened',
          title: issue.title || '',
          url: issue.html_url || ''
        }
      }
    }
    if (action === 'closed') {
      return {
        type: 'issues_closed',
        authorName: issue.closed_by?.login || body.sender?.login || '',
        authorEmail: '',
        meta: {
          note: `Closed issue #${issue.number}: ${issue.title || ''}`.slice(0, 200),
          number: issue.number,
          action: 'closed',
          title: issue.title || '',
          url: issue.html_url || ''
        }
      }
    }
    return null
  }

  if (event === 'pull_request_review' && body.action === 'submitted' && body.review) {
    return {
      type: 'review',
      authorName: body.review.user?.login || body.sender?.login || '',
      authorEmail: '',
      meta: {
        note: body.review.state ? `Pull request review: ${body.review.state}` : 'Pull request review',
        url: body.review.html_url || ''
      }
    }
  }

  return null
}

/**
 * Handles GitHub webhooks (real GitHub payloads and the Zeltxx simulator).
 * The route-level middleware already verified the X-Hub-Signature-256 HMAC.
 */
export const handleGitHubWebhook = async (req, res, next) => {
  try {
    const { projectId } = req.params
    const body = req.body || {}
    const event = req.headers['x-github-event'] || body.event || 'push'

    // GitHub "ping" keeps the configured webhook healthy.
    if (event === 'ping') return res.status(200).json({ message: 'pong' })

    const project = await Project.findById(projectId).populate('members.user', 'name email avatar')
    if (!project) return res.status(404).json({ error: 'Project not found' })

    let classified = classifyEvent(event, body)

    // Fallback for the Zeltxx simulator / custom payloads that pass a
    // type + author + meta directly.
    if (!classified && ['commit', 'review'].includes(body.type)) {
      const rawMeta = body.meta
      classified = {
        type: body.type,
        authorName: body.authorName || 'GitHub Committer',
        authorEmail: body.authorEmail || '',
        meta:
          typeof rawMeta === 'object' && rawMeta
            ? sanitizeMeta(rawMeta, ['sha', 'note', 'url', 'title'])
            : { note: typeof body.meta === 'string' && body.meta ? body.meta.slice(0, 500) : `GitHub Webhook Event: ${event}` }
      }
    }

    if (!classified) {
      return res.status(200).json({ message: 'Webhook received but event requires no contribution recording.', skipped: true })
    }

    if (!WEIGHTS[classified.type]) {
      return res.status(400).json({ error: `Unsupported contribution type from webhook: ${classified.type}` })
    }

    const enabledEvents = Array.isArray(project.webhookEvents)
      ? project.webhookEvents
      : WEBHOOK_EVENT_TYPES
    const category = TYPE_TO_CATEGORY[classified.type]
    if (category && !enabledEvents.includes(category)) {
      return res.status(200).json({
        message: `Webhook received but "${category}" events are disabled for this project.`,
        skipped: true
      })
    }

    const userId = await resolveUserForCommit(project, classified.authorEmail, classified.authorName)

    const isNumberedEvent = classified.meta?.number
    const dedupeQuery = isNumberedEvent
      ? { 'meta.number': classified.meta.number, 'meta.action': classified.meta.action }
      : classified.meta?.sha
        ? { 'meta.sha': classified.meta.sha }
        : null

    const result = await logContributionEvent({
      projectId,
      userId,
      type: classified.type,
      meta: classified.meta,
      io: req.io,
      enforceDailyCap: true,
      dedupeQuery
    })

    if (!result) {
      return res.status(200).json({ message: 'Contribution skipped (duplicate or over daily cap).', skipped: true })
    }

    res.status(201).json({ message: 'Webhook processed successfully', contribution: result })
  } catch (err) {
    next(err)
  }
}