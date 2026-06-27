import cron from 'node-cron'
import mongoose from 'mongoose'
import Contribution from '../models/contribution.js'
import Snapshot from '../models/snapshot.js'

export const startDailySnapshot = async (req, res) => {
    cron.schedule("0 0 * * *", async () => {
        console.log('Running daily snapshot...')

        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)

        const today = new Date()
        today.setHours(0, 0, 0, 0)


        const data = await Contribution.aggregate([
            { $match: { createdAt: { $gte: yesterday, $lt: today } } },
            {
                $group: {
                    _id: { project: '$project', user: '$user' },
                    totalCount: { $sum: 1 },
                    totalWeight: { $sum: '$weight' },
                    breakdown: { $push: '$type' }
                }
            }
        ])

        for (const entry of data) {
            const breakdown = entry.breakdown.reduce((acc, type) => {
                acc[type] = (acc[type] || 0) + 1
                return acc
            }, {})

            await Snapshot.findOneAndUpdate(
                {
                    project: entry._id.project,
                    user: entry._id.user,
                    date: yesterday
                },
                {
                    totalCount: entry.totalCount,
                    totalWeight: entry.totalWeight,
                    breakdown
                },
                { upsert: true }
            )
        }
        console.log(`Snapshot written for ${data.length} user-project pairs`)
    })
}