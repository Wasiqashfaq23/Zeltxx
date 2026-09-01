import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import User from '../src/models/user.js'
import Project from '../src/models/project.js'
import Task from '../src/models/task.js'
import Contribution from '../src/models/contribution.js'
import Chat from '../src/models/chat.js'
import Resource from '../src/models/resource.js'
import SNAPSHOT from '../src/models/SNAPSHOT.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/zeltxx'

async function clearData() {
  try {
    console.log('ðŸ§¹ Connecting to MongoDB at:', MONGO_URI)
    await mongoose.connect(MONGO_URI)
    console.log('âœ… Connected to MongoDB')

    // Preserve real user accounts (or find the primary admin user)
    const allUsers = await User.find({})
    console.log(`Found ${allUsers.length} user(s) in database.`)

    // Clear all dummy collections
    await Task.deleteMany({})
    await Chat.deleteMany({})
    await Contribution.deleteMany({})
    await SNAPSHOT.deleteMany({})
    await Resource.deleteMany({})
    await Project.deleteMany({})

    console.log('ðŸ—‘ï¸  Cleared dummy tasks, chat history, contributions, SNAPSHOTs, resources, and projects.')

    // Create 1 clean, active primary project linked to real GitHub repo
    if (allUsers.length > 0) {
      const primaryUser = allUsers[0]
      const cleanProject = await Project.create({
        name: 'Zeltxx Enterprise Platform',
        description: 'Real-time collaborative developer workspace connected to GitHub.',
        members: [{ user: primaryUser._id, role: 'admin' }],
        isActive: true
      })

      // Add default real resource links
      await Resource.create({
        project: cleanProject._id,
        title: 'Zeltxx GitHub Repository',
        url: 'https://github.com/Wasiqashfaq23/Zeltxx',
        category: 'repo',
        addedBy: primaryUser._id
      })

      console.log(`âœ¨ Created clean primary project: "${cleanProject.name}" (ID: ${cleanProject._id})`)
      console.log(`ðŸ”— GitHub Integration ready for: https://github.com/Wasiqashfaq23/Zeltxx`)
    }

    console.log('\nðŸŽ‰ DATABASE CLEANED SUCCESSFULLY! Ready for real GitHub commit syncing.')
    process.exit(0)
  } catch (err) {
    console.error('âŒ Error clearing database:', err)
    process.exit(1)
  }
}

clearData()
