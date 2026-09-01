import { createNotification } from './notify.service.js'

/** Pulls `@handle` mentions out of free text (gets more than an SQL LIKE). */
export const extractMentions = (text) => {
  if (!text) return []
  const matches = String(text).match(/@([a-zA-Z0-9_.-]{3,30})/g) || []
  return matches.map((m) => m.slice(1))
}

/**
 * Resolves `@name`/`@email` mentions against a project's member list and
 * fires a notification for each hit. Returns the number of notifications sent.
 */
export const notifyMentions = async ({ io, text, members, actorName, projectId, context }) => {
  const handles = extractMentions(text).map((h) => h.toLowerCase())
  if (!handles.length) return 0

  let sent = 0
  for (const member of members) {
    const user = member.user
    if (!user || !user._id) continue
    const name = String(user.name || '').toLowerCase()
    const email = String(user.email || '').toLowerCase()

    if (handles.some((handle) => name === handle || email === handle || (email && email.startsWith(handle)))) {
      await createNotification(io, {
        userId: user._id,
        type: 'mention',
        message: `${actorName || 'Someone'} mentioned you in ${context}`,
        project: projectId
      })
      sent += 1
    }
  }
  return sent
}