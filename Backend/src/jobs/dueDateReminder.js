import cron from 'node-cron'
import Task from '../models/task.js'
import { createNotification } from '../services/notify.service.js'

/**
 * Hourly job: notifies the assignee of every task whose dueDate falls within
 * the next 24 hours (and is not yet done).
 */
export const startDueDateReminders = (io) => {
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date()
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const dayKey = new Date().toISOString().slice(0, 10)

      const tasks = await Task.find({
        dueDate: { $gte: now, $lte: in24h },
        status: { $ne: 'done' },
        assignedTo: { $ne: null },
        lastDueReminderDateKey: { $ne: dayKey }
      }).populate('assignedTo', 'name email')

      let sent = 0
      for (const task of tasks) {
        const dueLabel = task.dueDate.toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        await createNotification(io, {
          userId: task.assignedTo._id,
          type: 'due_date',
          message: `Task "${task.title}" is due ${dueLabel}`,
          project: task.project
        })
        task.lastDueReminderDateKey = dayKey
        await task.save()
        sent += 1
      }
      if (sent > 0) console.log(`Due-date reminders sent for ${sent} task(s)`)
    } catch (err) {
      console.error('Due-date reminder cron failed:', err)
    }
  })
}