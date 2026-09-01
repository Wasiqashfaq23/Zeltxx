import Activity from '../models/activity.js'

/**
 * Records a project activity event for the activity feed.
 * Deliberately fire-and-forget safe via the optional `io` param.
 */
export const logActivity = async ({ projectId, actorId, actorName, type, message, meta, io }) => {
  try {
    const activity = await Activity.create({
      project: projectId,
      actor: actorId || null,
      actorName: (actorName || '').slice(0, 100),
      type,
      message: String(message || '').slice(0, 300),
      meta: meta || {}
    })
    if (io) io.to(String(projectId)).emit('activity_logged', activity)
    return activity
  } catch (err) {
    // Activity logging must never break core flows.
    console.error('[activity] log failed:', err.message)
    return null
  }
}