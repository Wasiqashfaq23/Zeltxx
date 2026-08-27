import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import Project from './src/models/project.js'
import Contribution from './src/models/contribution.js'
import User from './src/models/user.js'
import Snapshot from './src/models/snapshot.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/zeltxx'

async function repairCommits() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected to MongoDB.')

    const projects = await Project.find({}).populate('members.user', 'name email avatar')
    const allUsers = await User.find({})

    console.log(`🔍 Auditing commits across ${projects.length} project(s)...`)

    let repairedCount = 0

    for (const project of projects) {
      const contribs = await Contribution.find({ project: project._id, type: 'commit' })

      for (const contrib of contribs) {
        const meta = contrib.meta || {}
        const authorEmail = (meta.authorEmail || '').toLowerCase().trim()
        const authorName = (meta.authorName || '').toLowerCase().trim()

        let correctUserId = null

        // 1. Strict Email Lookup (Email is unique identifier)
        if (authorEmail) {
          const match = project.members.find((m) => m.user?.email?.toLowerCase().trim() === authorEmail)
          if (match?.user) {
            correctUserId = match.user._id || match.user
          } else {
            const userByEmail = allUsers.find((u) => u.email?.toLowerCase().trim() === authorEmail)
            if (userByEmail) correctUserId = userByEmail._id
          }
        } else if (authorName) {
          // 2. Strict Name Fallback (Only if authorEmail is missing)
          const match = project.members.find((m) => (m.user?.name || '').toLowerCase().trim() === authorName)
          if (match?.user) {
            correctUserId = match.user._id || match.user
          } else {
            const userByName = allUsers.find((u) => u.name?.toLowerCase().trim() === authorName)
            if (userByName) correctUserId = userByName._id
          }
        }

        // Update if user ID changed
        const currentUserIdStr = contrib.user ? contrib.user.toString() : null
        const correctUserIdStr = correctUserId ? correctUserId.toString() : null

        if (currentUserIdStr !== correctUserIdStr) {
          contrib.user = correctUserId
          await contrib.save()
          repairedCount++
          console.log(`🔧 Repaired commit [${meta.sha || contrib._id}]: ${meta.authorName || 'Developer'} (${meta.authorEmail || 'N/A'}) -> user: ${correctUserIdStr || 'null (External Committer)'}`)
        }
      }

      // Re-calculate Snapshots for accuracy
      await Snapshot.deleteMany({ project: project._id })
      const allContribs = await Contribution.find({ project: project._id })

      for (const c of allContribs) {
        if (c.user) {
          const dateStr = new Date(c.createdAt).toISOString().split('T')[0]
          await Snapshot.findOneAndUpdate(
            { project: project._id, user: c.user, date: new Date(dateStr) },
            {
              $inc: { totalCount: 1, totalWeight: c.weight || 1 },
              $set: { project: project._id, user: c.user, date: new Date(dateStr) }
            },
            { upsert: true }
          )
        }
      }
    }

    console.log(`🎉 Success! Repaired ${repairedCount} commit contribution document(s) in MongoDB.`)
    process.exit(0)
  } catch (err) {
    console.error('❌ Error during commit repair:', err)
    process.exit(1)
  }
}

repairCommits()
