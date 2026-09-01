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

  const matched = members.filter((member) => {
    const user = member.user
    if (!user || !user._id) return false
    const name = String(user.name || '').toLowerCase()
    const email = String(user.email || '').toLowerCase()
    return handles.some((handle) => name === handle || email === handle || (email && email.startsWith(handle)))
  })

  const sent = (
    await Promise.all(
      matched.map((member) =>
        createNotification(io, {
          userId: member.user._id,
          type: 'mention',
          message: `${actorName || 'Someone'} mentioned you in ${context}`,
          project: projectId
        })
      )
    )
  ).length

  return sent
}