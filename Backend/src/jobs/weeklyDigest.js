import cron from 'node-cron'
import Snapshot from '../models/snapshot.js'
import Project from '../models/project.js'
import User from '../models/user.js'
import { sendEmail, escapeHtml } from '../config/mailer.js'

/**
 * Sends a weekly per-user contribution digest every Monday at 9:00 AM,
 * aggregating the previous 7 days of snapshots across all projects.
 */
export const startWeeklyDigest = () => {
  cron.schedule('0 9 * * 1', async () => {
    try {
      const pass = process.env.SMTP_PASS
      if (!pass || pass.includes('dummy') || pass === 'your_app_password') {
        console.log('Weekly digest skipped: real SMTP credentials not configured.')
        return
      }

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      weekAgo.setHours(0, 0, 0, 0)

      const grouped = await Snapshot.aggregate([
        { $match: { date: { $gte: weekAgo } } },
        {
          $group: {
            _id: '$user',
            projects: {
              $push: { project: '$project', totalCount: '$totalCount', totalWeight: '$totalWeight' }
            }
          }
        }
      ])

      if (!grouped.length) {
        console.log('Weekly digest: no activity data for the last 7 days.')
        return
      }

      const users = await User.find({ _id: { $in: grouped.map((g) => g._id) } }).select('name email')
      const userMap = new Map(users.map((u) => [String(u._id), u]))

      const projectIds = [...new Set(grouped.flatMap((g) => g.projects.map((p) => p.project)))]
      const projects = await Project.find({ _id: { $in: projectIds } }).select('name')
      const projectMap = new Map(projects.map((p) => [String(p._id), p.name]))

      let sentCount = 0
      for (const entry of grouped) {
        const user = userMap.get(String(entry._id))
        if (!user?.email) continue

        const rows = entry.projects
          .map((p) => {
            const projectName = projectMap.get(String(p.project)) || 'Project'
            return `<li><strong>${escapeHtml(projectName)}</strong> — ${p.totalCount} contributions, ${p.totalWeight} pts</li>`
          })
          .join('')

        const textRows = entry.projects
          .map((p) => {
            const projectName = projectMap.get(String(p.project)) || 'Project'
            return `- ${projectName}: ${p.totalCount} contributions, ${p.totalWeight} pts`
          })
          .join('\n')

        const html = `
          <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px;">
            <h2 style="color: #60a5fa; margin-top: 0;">📊 Your Zeltxx Weekly Digest</h2>
            <p style="color: #cbd5e1;">Hi ${escapeHtml(user.name)}, here is your contribution summary for the last 7 days:</p>
            <ul style="color: #e2e8f0; line-height: 1.8;">${rows}</ul>
            <p style="color: #94a3b8; font-size: 12px;">Keep up the great work!</p>
          </div>
        `

        await sendEmail({
          to: user.email,
          subject: '📊 Your Zeltxx Weekly Contribution Digest',
          html,
          text: `Hi ${user.name},\n\nYour Zeltxx contribution summary for the last 7 days:\n\n${textRows}\n\nKeep up the great work!`
        })
        sentCount++
      }

      console.log(`Weekly digest sent to ${sentCount} users`)
    } catch (err) {
      console.error('Weekly digest cron failed:', err)
    }
  })
}