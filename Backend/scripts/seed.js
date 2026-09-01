import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import User from '../src/models/user.js'
import Project from '../src/models/project.js'
import Task from '../src/models/task.js'
import Contribution, { WEIGHTS } from '../src/models/contribution.js'
import Chat from '../src/models/chat.js'
import Resource from '../src/models/resource.js'
import SNAPSHOT from '../src/models/SNAPSHOT.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/zeltxx'

async function seed() {
  try {
    console.log('ðŸŒ± Connecting to MongoDB at:', MONGO_URI)
    await mongoose.connect(MONGO_URI)
    console.log('âœ… Connected to MongoDB')

    // Find any existing user (e.g. logged in user) to preserve their account!
    const existingUsers = await User.find({})
    console.log(`Found ${existingUsers.length} existing user(s) in database.`)

    // Seed dummy users if not present
    const dummyUserDefs = [
      {
        name: 'Sarah Chen',
        email: 'sarah.chen@zeltxx.io',
        googleId: 'google_dummy_sarah_101',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        statusText: 'âš¡ Architecting v2 pipeline',
        bio: 'Principal Systems Architect & Technical Co-founder at Zeltxx.'
      },
      {
        name: 'Alex Rivera',
        email: 'alex.rivera@zeltxx.io',
        googleId: 'google_dummy_alex_102',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        statusText: 'ðŸš€ Refactoring React components',
        bio: 'Senior Frontend Specialist passionate about UI/UX & design systems.'
      },
      {
        name: 'Elena Rostova',
        email: 'elena.rostova@zeltxx.io',
        googleId: 'google_dummy_elena_103',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        statusText: 'â˜• Coffee break & CI/CD ops',
        bio: 'DevOps & Reliability Engineer keeping builds lightning fast.'
      }
    ]

    const createdDummyUsers = []
    for (const def of dummyUserDefs) {
      let u = await User.findOne({ email: def.email })
      if (!u) {
        u = await User.create(def)
        console.log(`Created dummy user: ${u.name}`)
      }
      createdDummyUsers.push(u)
    }

    // Include existing user(s) so logged-in user is admin on all seeded projects!
    const allUsers = [...existingUsers, ...createdDummyUsers]
    const uniqueUsers = Array.from(new Map(allUsers.map((u) => [u._id.toString(), u])).values())
    const primaryUser = uniqueUsers[0]

    console.log(`Using ${uniqueUsers.length} total users for project assignments. Primary admin: ${primaryUser.name}`)

    // Create project members list
    const projectMembers = uniqueUsers.map((u, index) => ({
      user: u._id,
      role: index === 0 || u.email === primaryUser.email ? 'admin' : 'collaborator'
    }))

    // Projects to seed
    const projectsDef = [
      {
        name: 'Zeltxx Enterprise Platform v2',
        description: 'Next-generation project management platform with real-time sync, automated metrics & team leaderboard.',
        notes: `### ðŸŽ¯ Project Goals\n- Elevate UI/UX to 60fps glassmorphism standard\n- Real-time Socket.io collaborative task boards\n- Automated GitHub Webhooks integration\n\n### ðŸ“Œ Key Milestones\n1. Sprint 1: Auth & User Profiles\n2. Sprint 2: Kanban & Live Chat\n3. Sprint 3: AI IntelliSense & Leaderboard`,
        members: projectMembers
      },
      {
        name: 'AI Neural Analytics Pipeline',
        description: 'High-throughput predictive intelligence engine for team performance & workload balancing.',
        notes: `### ðŸ§  Pipeline Architecture\n- Kafka streams -> Python worker pools -> Mongo Aggregations\n- Target latency < 50ms per contribution event`,
        members: projectMembers
      },
      {
        name: 'Design System & Component Library',
        description: 'Accessible WCAG 2.1 AA compliant UI token system and React 19 component library.',
        notes: `### ðŸŽ¨ Design Tokens\n- Primary: Blue-600\n- Dark Mode: Permanent Slate-900 / Slate-950\n- Zero hardcoded colors!`,
        members: projectMembers
      }
    ]

    const seededProjects = []
    for (const pDef of projectsDef) {
      let proj = await Project.findOne({ name: pDef.name })
      if (!proj) {
        proj = await Project.create(pDef)
        console.log(`Created project: ${proj.name}`)
      } else {
        proj.members = pDef.members
        await proj.save()
      }
      seededProjects.push(proj)
    }

    // Seed Tasks for each project
    console.log('ðŸ“‹ Seeding Tasks...')
    const sampleTaskTitles = [
      { title: 'Refactor Auth Context and Token Deduplication', status: 'done', priority: 'high' },
      { title: 'Implement Permanent Dark Sidebar Shell with Glassmorphism', status: 'done', priority: 'high' },
      { title: 'Fix WCAG 2.1 AA Contrast Ratios in Input Primitives', status: 'done', priority: 'medium' },
      { title: 'Setup Automated GitHub Webhook Payload Parser', status: 'in_progress', priority: 'high' },
      { title: 'Build Live Socket.io Multi-User Cursor Presence Bar', status: 'in_progress', priority: 'medium' },
      { title: 'Optimize Recharts Donut & Area Chart Load Speed', status: 'in_progress', priority: 'low' },
      { title: 'Add One-Click Markdown Summary Export Tool', status: 'todo', priority: 'medium' },
      { title: 'Configure ElevenLabs Voice AI Assistant Integration', status: 'todo', priority: 'low' }
    ]

    for (const proj of seededProjects) {
      const existingTaskCount = await Task.countDocuments({ project: proj._id })
      if (existingTaskCount === 0) {
        for (let i = 0; i < sampleTaskTitles.length; i++) {
          const tDef = sampleTaskTitles[i]
          const assignedUser = uniqueUsers[i % uniqueUsers.length]
          await Task.create({
            title: tDef.title,
            description: `Automated implementation task for ${proj.name}. Requires thorough testing & code review.`,
            status: tDef.status,
            priority: tDef.priority,
            dueDate: new Date(Date.now() + (i + 1) * 86400000 * 3),
            subtasks: [
              { title: 'Write unit & integration tests', completed: tDef.status === 'done' },
              { title: 'Perform accessibility contrast check', completed: true },
              { title: 'Deploy preview build to staging', completed: tDef.status === 'done' }
            ],
            comments: [
              {
                user: assignedUser._id,
                text: 'Tested locally, LGTM! Pushing latest commit now.',
                createdAt: new Date(Date.now() - i * 3600000)
              }
            ],
            assignedTo: assignedUser._id,
            project: proj._id,
            createdBy: primaryUser._id
          })
        }
        console.log(`Seeded tasks for project: ${proj.name}`)
      }
    }

    // Seed Activity Feed Contributions & Daily SNAPSHOTs
    console.log('ðŸ“ˆ Seeding Contributions & 14-Day Activity SNAPSHOTs...')
    const contribTypes = ['commit', 'review', 'task_complete', 'file_upload', 'comment']

    for (const proj of seededProjects) {
      const existingContribCount = await Contribution.countDocuments({ project: proj._id })
      if (existingContribCount < 10) {
        for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
          const targetDate = new Date()
          targetDate.setDate(targetDate.getDate() - dayOffset)
          const dateStr = targetDate.toISOString().split('T')[0]

          for (const u of uniqueUsers) {
            const numContribs = Math.floor(Math.random() * 4) + 1
            let dayWeight = 0
            const breakdown = {}

            for (let c = 0; c < numContribs; c++) {
              const type = contribTypes[Math.floor(Math.random() * contribTypes.length)]
              const weight = WEIGHTS[type] || 1
              dayWeight += weight
              breakdown[type] = (breakdown[type] || 0) + 1

              await Contribution.create({
                project: proj._id,
                user: u._id,
                type,
                weight,
                meta: {
                  commitMsg: `feat(${type}): optimized module build & pipeline stage`,
                  sha: Math.random().toString(36).substring(2, 9)
                },
                reactions: [
                  { user: primaryUser._id, emoji: 'ðŸ”¥' },
                  { user: u._id, emoji: 'ðŸš€' }
                ],
                createdAt: targetDate
              })
            }

            await SNAPSHOT.findOneAndUpdate(
              { project: proj._id, user: u._id, date: new Date(dateStr) },
              {
                project: proj._id,
                user: u._id,
                date: new Date(dateStr),
                totalCount: numContribs,
                totalWeight: dayWeight,
                breakdown
              },
              { upsert: true, new: true }
            )
          }
        }
        console.log(`Seeded 14-day activity SNAPSHOTs for: ${proj.name}`)
      }
    }

    // Seed Team Chat Messages
    console.log('ðŸ’¬ Seeding Live Team Chat...')
    for (const proj of seededProjects) {
      const chatCount = await Chat.countDocuments({ project: proj._id })
      if (chatCount === 0) {
        const sampleMessages = [
          'Hey team! Welcome to the new Zeltxx platform workspace. ðŸš€',
          'The dark sidebar shell and blue theme contrast updates are now live!',
          'Great work on the task board drag & drop experience.',
          'Checking CI/CD pipeline build status... All green! âœ…'
        ]
        for (let i = 0; i < sampleMessages.length; i++) {
          const u = uniqueUsers[i % uniqueUsers.length]
          await Chat.create({
            project: proj._id,
            user: u._id,
            message: sampleMessages[i],
            createdAt: new Date(Date.now() - (sampleMessages.length - i) * 600000)
          })
        }
        console.log(`Seeded chat messages for: ${proj.name}`)
      }
    }

    // Seed Resources (Docs & Links)
    console.log('ðŸ”— Seeding Project Resources...')
    for (const proj of seededProjects) {
      const resCount = await Resource.countDocuments({ project: proj._id })
      if (resCount === 0) {
        await Resource.create([
          {
            title: 'GitHub Repository Codebase',
            url: 'https://github.com/Wasiqashfaq23/Zeltxx',
            category: 'repo',
            project: proj._id,
            addedBy: primaryUser._id
          },
          {
            title: 'Zeltxx UI Design Tokens System',
            url: 'https://figma.com/file/zeltxx-design-system',
            category: 'design',
            project: proj._id,
            addedBy: primaryUser._id
          },
          {
            title: 'API Specification & Endpoint Docs',
            url: 'http://localhost:5001/api-docs',
            category: 'docs',
            project: proj._id,
            addedBy: primaryUser._id
          }
        ])
        console.log(`Seeded resources for: ${proj.name}`)
      }
    }

    console.log('\nðŸŽ‰ DATABASE SEEDING COMPLETED SUCCESSFULLY!')
    console.log('Summary:')
    console.log(`- Users: ${uniqueUsers.length}`)
    console.log(`- Projects: ${seededProjects.length}`)
    console.log(`- Tasks & Activity Feed: Fully Populated`)
    console.log(`- 14-Day Metrics & Leaderboards: Ready to view!`)

    process.exit(0)
  } catch (err) {
    console.error('âŒ Seeding Error:', err)
    process.exit(1)
  }
}

seed()
