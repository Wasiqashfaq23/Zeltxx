import ProjectModel from "../models/project.js"
import Invite from "../models/invite.js"
import Notification from "../models/notification.js"
import User from "../models/user.js"
import Task from "../models/task.js"
import Contribution from "../models/contribution.js"
import Chat from "../models/chat.js"
import Resource from "../models/resource.js"
import Snapshot from "../models/snapshot.js"
import Activity from "../models/activity.js"
import { sendEmail, buildInviteEmailHtml } from "../config/mailer.js"
import { syncGitHubCommitsInternal } from "./github.js"
import { handleControllerError } from '../middleware/errorHandler.js'
import { adminCount } from '../services/membership.js'
import { notifyMentions } from '../services/mention.service.js'
import { logActivity } from '../services/activity.service.js'
import { PROJECT_ROLES, WEBHOOK_EVENT_TYPES } from '../config/constants.js'
import crypto from 'crypto'
import mongoose from 'mongoose'

const cleanName = (name) => (typeof name === 'string' ? name.trim().slice(0, 80) : '')
const cleanDescription = (desc) => (typeof desc === 'string' ? desc.trim().slice(0, 500) : '')

export const createProject = async (req, res) => {
    try {
        const { name, description, githubUrl } = req.body

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Project name is required' })
        }

        const projectDoc = await ProjectModel.create({
            name: cleanName(name),
            description: cleanDescription(description),
            githubUrl: githubUrl ? githubUrl.trim().slice(0, 500) : '',
            members: [{ user: req.user._id, role: 'admin' }]
        })

        // Auto-add Resource link if GitHub URL provided
        if (githubUrl && githubUrl.trim()) {
            await Resource.create({
                project: projectDoc._id,
                title: `${name.trim()} GitHub Repository`,
                url: githubUrl.trim().slice(0, 2000),
                category: 'repo',
                addedBy: req.user._id
            }).catch((e) => console.error('Auto resource creation warning:', e.message))

            // Trigger background auto-sync of initial GitHub commits
            syncGitHubCommitsInternal(projectDoc._id, githubUrl.trim(), req.user._id, req.io)
                .catch((e) => console.error('Initial GitHub auto-sync warning:', e.message))
        }

        const populated = await ProjectModel.findById(projectDoc._id).populate("members.user", "name email avatar")
        res.status(201).json(populated)
    } catch (error) {
        handleControllerError(res, error)
    }
}

export const getProjects = async (req, res) => {
    try {
        const projects = await ProjectModel.find({ "members.user": req.user._id, isActive: true }).populate("members.user", "name email avatar")
        res.status(200).json(projects)
    } catch (error) {
        handleControllerError(res, error)
    }
}

export const getProjectById = async (req, res) => {
    const projectDoc = await ProjectModel.findById(req.params.id).populate("members.user", "name email avatar")

    if (!projectDoc || !projectDoc.isActive) {
        return res.status(404).json({ message: "Project not found" })
    }

    const isMember = projectDoc.members.some(m => m.user._id.toString() === req.user._id.toString())

    if (!isMember) {
        return res.status(403).json({ message: "Not a member of this project" })
    }

    res.status(200).json(projectDoc)
}

export const updateProject = async (req, res) => {
    try {
        const { name, description, githubUrl } = req.body
        const projectDoc = await ProjectModel.findById(req.params.id)
        if (!projectDoc || !projectDoc.isActive) {
            return res.status(404).json({ message: 'Project not found' })
        }

        const isAdmin = projectDoc.members.some(
            (m) => m.user.toString() === req.user._id.toString() && m.role === 'admin'
        )
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only project admins can edit project details' })
        }

        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ message: 'Project name must be a non-empty string' })
            }
            projectDoc.name = cleanName(name)
        }
        if (description !== undefined) projectDoc.description = cleanDescription(description)
        projectDoc.githubUrl = githubUrl !== undefined ? githubUrl.trim().slice(0, 500) : projectDoc.githubUrl
        await projectDoc.save()

        if (githubUrl && githubUrl.trim()) {
            syncGitHubCommitsInternal(projectDoc._id, githubUrl.trim(), req.user._id, req.io)
                .catch((e) => console.error('GitHub update sync warning:', e.message))
        }

        const populated = await ProjectModel.findById(projectDoc._id).populate('members.user', 'name email avatar')
        res.status(200).json(populated)
    } catch (err) {
        handleControllerError(res, err)
    }
}

export const deleteProject = async (req, res) => {
    try {
        const projectId = req.params.id
        const projectDoc = await ProjectModel.findById(projectId)
        if (!projectDoc) {
            return res.status(404).json({ message: 'Project not found' })
        }

        const isAdmin = projectDoc.members.some(
            (m) => m.user.toString() === req.user._id.toString() && m.role === 'admin'
        )
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only project admins can delete a project' })
        }

        // Cascade delete all associated documents
        await Promise.all([
            ProjectModel.findByIdAndDelete(projectId),
            Task.deleteMany({ project: projectId }),
            Contribution.deleteMany({ project: projectId }),
            Chat.deleteMany({ project: projectId }),
            Resource.deleteMany({ project: projectId }),
            Snapshot.deleteMany({ project: projectId }),
            Invite.deleteMany({ project: projectId })
        ])

        res.status(200).json({ message: 'Project and all associated resources deleted successfully' })
    } catch (err) {
        handleControllerError(res, err)
    }
}

export const inviteMember = async (req, res) => {
    try {
        const { email, role } = req.body
        const targetRole = PROJECT_ROLES.includes(role) ? role : 'collaborator'

        if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({ message: 'A valid email is required' })
        }

        const projectDoc = await ProjectModel.findById(req.params.id)

        if (!projectDoc) return res.status(404).json({ message: 'Project not found' })

        const isAdmin = projectDoc.members.some(
            (m) => m.user.toString() === req.user._id.toString() && m.role === 'admin'
        )
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only project admins can invite members' })
        }

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
        const inviteUrl = `${clientUrl}/projects/${projectDoc._id}`
        const inviterName = req.user?.name || 'Workspace Admin'

        const existingUser = await User.findOne({ email: email.toLowerCase() })

        if (existingUser) {
            const alreadyMember = projectDoc.members.some(m => m.user.toString() === existingUser._id.toString())
            if (alreadyMember) return res.status(400).json({ message: 'User is already a member of this project' })

            // Check if active pending notification exists
            const existingNotif = await Notification.findOne({
                user: existingUser._id,
                project: projectDoc._id,
                type: 'project_invite',
                status: 'pending'
            })
            if (existingNotif) {
                return res.status(400).json({ message: 'Invitation is already pending for this user' })
            }

            const notif = await Notification.create({
                user: existingUser._id,
                type: 'project_invite',
                message: `${inviterName} invited you to join project "${projectDoc.name}"`,
                project: projectDoc._id,
                inviterName,
                role: targetRole,
                status: 'pending'
            })

            const populatedNotif = await notif.populate('project', 'name')

            req.io?.to(`user_${existingUser._id.toString()}`).emit('notification', populatedNotif)

            // Send Email Invitation
            sendEmail({
                to: existingUser.email,
                subject: `📩 ${inviterName} invited you to join ${projectDoc.name} on Zeltxx`,
                text: `${inviterName} has invited you to join project "${projectDoc.name}". Access workspace: ${inviteUrl}`,
                html: buildInviteEmailHtml({ projectName: projectDoc.name, inviteUrl, inviterName })
            }).catch((e) => console.error('Invite email failed:', e.message))

            return res.status(200).json({ message: `Invitation sent to ${existingUser.email}! Receiver can Accept or Reject in their notifications.` })
        }

        const existingInvite = await Invite.findOne({ project: projectDoc._id, email: email.toLowerCase() })
        if (existingInvite) return res.status(400).json({ message: 'Invite already sent to this email' })

        await Invite.create({
            project: projectDoc._id,
            email: email.toLowerCase(),
            role: targetRole,
            invitedBy: req.user._id
        })

        // Send Email Invitation to new user
        sendEmail({
            to: email.toLowerCase(),
            subject: `📩 ${inviterName} invited you to join Zeltxx Project: ${projectDoc.name}`,
            text: `You have been invited to join project "${projectDoc.name}" by ${inviterName}. Sign up to join: ${inviteUrl}`,
            html: buildInviteEmailHtml({ projectName: projectDoc.name, inviteUrl, inviterName })
        }).catch((e) => console.error('Invite email failed:', e.message))

        res.status(201).json({ message: `Invitation email sent to ${email}!` })
    } catch (err) {
        handleControllerError(res, err)
    }
}

export const removeMember = async (req, res) => {
    try {
        const projectDoc = await ProjectModel.findById(req.params.id)
        if (!projectDoc) return res.status(404).json({ message: 'Project not found' })

        const isAdmin = projectDoc.members.some(
            (m) => m.user.toString() === req.user._id.toString() && m.role === 'admin'
        )
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only project admins can remove members' })
        }

        const { userId } = req.params
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' })
        }

        const target = projectDoc.members.find((m) => m.user.toString() === userId.toString())
        if (!target) return res.status(404).json({ message: 'User is not a member of this project' })

        // Never leave the project without an admin.
        if (target.role === 'admin' && adminCount(projectDoc) <= 1) {
            return res.status(400).json({ message: 'Cannot remove the last admin of the project' })
        }

        projectDoc.members = projectDoc.members.filter(
            (m) => m.user.toString() !== userId.toString()
        )
        await projectDoc.save()

        const populated = await ProjectModel.findById(projectDoc._id).populate('members.user', 'name email avatar')
        res.json(populated)
    } catch (err) {
        handleControllerError(res, err)
    }
}

/**
 * Generates (or regenerates) the project webhook secret used to verify
 * X-Hub-Signature-256 headers on incoming GitHub webhooks.
 * The secret is shown exactly once to the caller.
 */
export const generateWebhookSecret = async (req, res) => {
    try {
        const projectDoc = await ProjectModel.findById(req.params.id).select('+webhookSecret')
        if (!projectDoc) return res.status(404).json({ message: 'Project not found' })

        projectDoc.webhookSecret = crypto.randomBytes(32).toString('hex')
        await projectDoc.save()

        res.status(200).json({
            message: 'New webhook secret generated. Copy it now — it will not be shown again.',
            webhookSecret: projectDoc.webhookSecret
        })
    } catch (err) {
        handleControllerError(res, err)
    }
}

/**
 * Sets which GitHub webhook event categories this project records.
 * Categories not enabled are silently skipped by the webhook handler.
 */
export const updateWebhookEvents = async (req, res) => {
    try {
        const { events } = req.body
        if (!Array.isArray(events) || events.some((e) => !WEBHOOK_EVENT_TYPES.includes(e))) {
            return res.status(400).json({ message: `Valid event types: ${WEBHOOK_EVENT_TYPES.join(', ')}` })
        }

        const projectDoc = await ProjectModel.findById(req.params.id)
        if (!projectDoc || !projectDoc.isActive) {
            return res.status(404).json({ message: 'Project not found' })
        }

        projectDoc.webhookEvents = [...new Set(events)]
        await projectDoc.save()

        res.json({ webhookEvents: projectDoc.webhookEvents })
    } catch (err) {
        handleControllerError(res, err)
    }
}

export const getProjectActivity = async (req, res) => {
    try {
        const { id } = req.params
        const projectDoc = await ProjectModel.findById(id)
        if (!projectDoc || !projectDoc.isActive) {
            return res.status(404).json({ message: 'Project not found' })
        }

        const isMember = projectDoc.members.some(
            (m) => m.user.toString() === req.user._id.toString()
        )
        if (!isMember) {
            return res.status(403).json({ message: 'Not a member of this project' })
        }

        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100)
        const offset = parseInt(req.query.offset, 10) || 0

        const activities = await Activity.find({ project: id })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .populate('actor', 'name email avatar')
            .lean()

        res.json(activities)
    } catch (err) {
        handleControllerError(res, err)
    }
}

export const updateProjectNotes = async (req, res) => {
    try {
        const { id } = req.params
        const { notes } = req.body

        const projectDoc = await ProjectModel.findById(id)
        if (!projectDoc || !projectDoc.isActive) {
            return res.status(404).json({ message: 'Project not found' })
        }

        const isMember = projectDoc.members.some(
            (m) => m.user.toString() === req.user._id.toString()
        )
        if (!isMember) {
            return res.status(403).json({ message: 'Not a member of this project' })
        }

        projectDoc.notes = notes !== undefined && notes !== null ? String(notes).slice(0, 20000) : ''
        await projectDoc.save()

        req.io?.to(id).emit('note_change', { notes: projectDoc.notes, updatedBy: req.user.name })

        if (projectDoc.notes) {
          const membersDoc = await ProjectModel.findById(id)
            .select('members')
            .populate('members.user', 'name email')
          await notifyMentions({
            io: req.io,
            text: projectDoc.notes,
            members: membersDoc?.members || [],
            actorName: req.user.name,
            projectId: id,
            context: 'project notes'
          })
        }

        await logActivity({
          projectId: id,
          actorId: req.user._id,
          actorName: req.user.name,
          type: 'notes_updated',
          message: `${req.user.name} updated the shared project notes`,
          io: req.io
        })

        res.json({ notes: projectDoc.notes })
    } catch (err) {
        handleControllerError(res, err)
    }
}