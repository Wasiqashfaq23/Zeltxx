import cron from 'node-cron'
import Task from '../models/task.js'
import { spawnNextOccurrence } from '../controllers/task.js'

// Safety net for recurring tasks that were completed before the recurrence
// feature shipped (they never spawned a child). For each such task we create
// a fresh occurrence if one has not already been spawned. Normal completions
// are handled inline by updateTask, making this idempotent.
export const startRecurringTasks = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      const doneRecurring = await Task.find({
        status: 'done',
        recurrence: { $ne: 'none' },
        recurringParent: null
      })

      let spawned = 0
      for (const task of doneRecurring) {
        const existingChild = await Task.findOne({ recurringParent: task._id }).select('_id')
        if (existingChild) continue
        const child = await spawnNextOccurrence(task)
        if (child) spawned += 1
      }

      if (spawned > 0) console.log(`[recurring] spawned ${spawned} overdue recurring task(s)`)
    } catch (err) {
      console.error('[recurring] job failed:', err.message)
    }
  })
}