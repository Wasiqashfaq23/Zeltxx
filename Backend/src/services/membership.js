// Membership helpers that tolerate both populated (m.user is a User doc)
// and raw (m.user is an ObjectId) member arrays.

const toStr = (value) => {
  if (!value) return null
  if (typeof value === 'object' && value._id) return value._id.toString()
  return value.toString ? value.toString() : String(value)
}

export const isMember = (project, userId) => {
  if (!project || !project.members || !userId) return false
  return project.members.some((m) => toStr(m.user) === toStr(userId))
}

export const memberRole = (project, userId) => {
  if (!project || !project.members || !userId) return null
  const member = project.members.find((m) => toStr(m.user) === toStr(userId))
  return member ? member.role : null
}

export const isAdmin = (project, userId) => memberRole(project, userId) === 'admin'

export const adminCount = (project) =>
  project && project.members ? project.members.filter((m) => memberRole(project, m.user) === 'admin').length : 0