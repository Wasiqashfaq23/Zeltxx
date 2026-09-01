import Contribution, { WEIGHTS } from '../models/contribution.js'
import { DAILY_CAPS, isHttpUrl } from '../config/constants.js'
import { upsertDaySnapshot } from './snapshot.service.js'
import { logActivity } from './activity.service.js'

/**
 * Restricts contribution meta to an allowlist of keys so user-supplied
 * metadata can't spoof leaderboard / CSV fields (author*, sha, number, ...).
 */
export const sanitizeMeta = (meta, allowed = ['note', 'url', 'title']) => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {}
  const cleaned = {}
  for (const key of allowed) {
    if (typeof meta[key] === 'string') {
      if (key === 'url' && !isHttpUrl(meta[key])) continue
      cleaned[key] = meta[key].slice(0, 500)
    }
  }
  return cleaned
}

/**
 * Creates a contribution document through the single guarded path:
 *  - canonical weight (from pre-save hook)
 *  - optional daily cap check (anti point-farming)
 *  - optional dedupe callback (e.g. unique task_complete)
 *  - live socket broadcast
 *  - daily snapshot increment
 *
 * Returns the populated contribution, or null when skipped (cap/dedupe).
 */
export const logContributionEvent = async ({
  projectId,
  userId,
  type,
  meta,
  createdAt,
  io,
  enforceDailyCap = false,
  dedupeQuery = null,
  emit = true
}) => {
  if (!projectId || !type) throw new Error('projectId and type are required')
  if (!WEIGHTS[type]) throw new Error(`Unsupported contribution type: ${type}`)

  if (dedupeQuery) {
    const existing = await Contribution.findOne({ project: projectId, user: userId, type, ...dedupeQuery })
    if (existing) return null
  }

  if (enforceDailyCap && userId) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todayCount = await Contribution.countDocuments({
      project: projectId,
      user: userId,
      type,
      createdAt: { $gte: startOfDay }
    })
    const cap = DAILY_CAPS[type] || 50
    if (todayCount >= cap) return null
  }

  const payload = { project: projectId, user: userId || null, type, meta: meta || {} }
  if (createdAt) payload.createdAt = createdAt

  const contribution = await Contribution.create(payload)
  const populated = await contribution.populate('user', 'name email avatar statusText')

  if (emit && io) io.to(String(projectId)).emit('new_contribution', populated)

  if (userId) {
    await upsertDaySnapshot({
      projectId,
      userId,
      date: createdAt || contribution.createdAt,
      weight: populated.weight || 1
    })
  }

  const typeLabel = populated.meta?.title
    ? `completed task "${populated.meta.title}"`
    : populated.meta?.note
      ? populated.meta.note
      : populated.type.replace(/_/g, ' ')
  await logActivity({
    projectId,
    actorId: userId,
    actorName: populated.user?.name,
    type: `contribution:${type}`,
    message: `${populated.user?.name || populated.meta?.authorName || 'Member'} logged a ${typeLabel} contribution (+${populated.weight || 1} pts)`,
    meta: { contributionId: populated._id, contributionType: type },
    io
  })

  return populated
}