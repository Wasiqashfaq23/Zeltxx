import Snapshot from '../models/snapshot.js'

/**
 * Increments (or creates) the daily snapshot for a (project, user, date).
 * All live contribution events funnel through here so counts stay in sync.
 */
export const upsertDaySnapshot = async ({ projectId, userId, date = new Date(), count = 1, weight = 0 }) => {
  const day = new Date(date.toISOString().split('T')[0])
  return Snapshot.findOneAndUpdate(
    { project: projectId, user: userId, date: day },
    {
      $inc: { totalCount: count, totalWeight: weight },
      $setOnInsert: { project: projectId, user: userId, date: day }
    },
    { upsert: true }
  )
}