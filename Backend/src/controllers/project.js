import ProjectModel from "../models/project.js"
import Invite from "../models/invite.js"
import Notification from "../models/notification.js"
import User from "../models/user.js"
import Task from "../models/task.js"
import Contribution from "../models/contribution.js"
import Chat from "../models/chat.js"
import Resource from "../models/resource.js"
import Snapshot from "../models/snapshot.js"
import { sendEmail, buildInviteEmailHtml } from "../config/mailer.js"

export const createProject = async (req, res) => {
    try {
        const { name, description } = req.body

        const projectDoc = await ProjectModel.create({
            name,
            description,
            members: [{ user: req.user._id, role: 'admin' }]
        })
        res.status(201).json(projectDoc)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

export const getProjects = async (req, res) => {
    try {
        const projects = await ProjectModel.find({ "members.user": req.user._id, isActive: true }).populate("members.user", "name email avatar")
        res.status(200).json(projects)
    } catch (error) {
        res.status(400).json({ message: error.message })
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
        const { name, description } = req.body
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

        projectDoc.name = name !== undefined ? name : projectDoc.name
        projectDoc.description = description !== undefined ? description : projectDoc.description
        await projectDoc.save()

        const populated = await ProjectModel.findById(projectDoc._id).populate('members.user', 'name email avatar')
        res.status(200).json(populated)
    } catch (err) {
        res.status(500).json({ message: err.message })
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
        res.status(500).json({ message: err.message })
    }
}

export const inviteMember = async (req, res) => {
    try {
        const { email, role } = req.body
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
            if (alreadyMember) return res.status(400).json({ message: 'User is already a member' })

            projectDoc.members.push({ user: existingUser._id, role: role || 'collaborator' })
            await projectDoc.save()

            const notif = await Notification.create({
                user: existingUser._id,
                type: 'project_invite',
                message: `You were added to ${projectDoc.name}`,
                project: projectDoc._id
            })

            req.io?.to(`user_${existingUser._id.toString()}`).emit('notification', notif)

            // Send Email Notification
            sendEmail({
                to: existingUser.email,
                subject: `🚀 Added to Project: ${projectDoc.name} on Zeltxx`,
                text: `You have been added to project "${projectDoc.name}" by ${inviterName}. Access workspace: ${inviteUrl}`,
                html: buildInviteEmailHtml({ projectName: projectDoc.name, inviteUrl, inviterName })
            })

            const populated = await ProjectModel.findById(projectDoc._id).populate('members.user', 'name email avatar')
            return res.json(populated)
        }

        const existingInvite = await Invite.findOne({ project: projectDoc._id, email: email.toLowerCase() })
        if (existingInvite) return res.status(400).json({ message: 'Invite already sent to this email' })

        await Invite.create({
            project: projectDoc._id,
            email: email.toLowerCase(),
            role: role || 'collaborator',
            invitedBy: req.user._id
        })

        // Send Email Invitation to new user
        sendEmail({
            to: email.toLowerCase(),
            subject: `📩 Invitation to join Zeltxx Project: ${projectDoc.name}`,
            text: `You have been invited to join project "${projectDoc.name}" by ${inviterName}. Sign up to join: ${inviteUrl}`,
            html: buildInviteEmailHtml({ projectName: projectDoc.name, inviteUrl, inviterName })
        })

        res.status(201).json({ message: `Invite sent to ${email}! Email notification dispatched.` })
    } catch (err) {
        res.status(500).json({ message: err.message })
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

        projectDoc.members = projectDoc.members.filter(
            (m) => m.user.toString() !== req.params.userId
        )
        await projectDoc.save()

        const populated = await ProjectModel.findById(projectDoc._id).populate('members.user', 'name email avatar')
        res.json(populated)
    } catch (err) {
        res.status(500).json({ message: err.message })
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

        projectDoc.notes = notes !== undefined ? notes : ''
        await projectDoc.save()

        req.io?.to(id).emit('note_change', { notes: projectDoc.notes, updatedBy: req.user.name })
        res.json({ notes: projectDoc.notes })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}