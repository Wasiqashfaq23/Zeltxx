import mongoose from 'mongoose'
import Contribution from "../models/contribution.js";
import Project from "../models/project.js";

const WEIGHTS = {
    commit: 4,
    review: 3,
    task_complete: 2,
    file_upload: 2,
    comment: 1
}

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value)

export const logContribution = async (req, res) => {
    try {
        const { projectId, type, meta } = req.body

        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json({ message: "Invalid projectId. Please provide a valid MongoDB ObjectId." })
        }

        const project = await Project.findById(projectId)
        if (!project) {
            return res.status(404).json({ message: "Project not found" })
        }

        const isMember = project.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this project" })
        }

        const weight = WEIGHTS[type] || 1

        const contribution = await Contribution.create({
            project: projectId,
            user: req.user._id,
            type,
            weight,
            meta
        })

        const populatedContribution = await contribution.populate('user', 'name email avatar')

        req.io.to(projectId).emit('new_contribution', populatedContribution)
        res.status(201).json(populatedContribution)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

export const getContribution = async (req, res) => {
    try {
        const { projectId } = req.params

        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json({ message: "Invalid projectId. Please provide a valid MongoDB ObjectId." })
        }

        const project = await Project.findById(projectId)
        if (!project) {
            return res.status(404).json({ message: "Project not found" })
        }
        
        const isMember = project.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this project" })
        }  
        const contributions = await Contribution.find({ project: projectId }).populate("user", "name email avatar").sort({ createdAt: -1 })
        res.status(200).json(contributions)
    } catch (err) {
        res.status(400).json({ message: err.message })
    }
}

export const getProjectSummary = async (req, res) => {
    try {
        const { projectId } = req.params

        if (!projectId || !isValidObjectId(projectId)) {
            return res.status(400).json({ message: "Invalid projectId. Please provide a valid MongoDB ObjectId." })
        }

        const project = await Project.findById(projectId)
        if (!project) {
            return res.status(404).json({ message: "Project not found" })
        }
        const isMember = project.members.some(m => m.user.toString() === req.user._id.toString())
        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this project" })
        }

        const rawSummary = await Contribution.aggregate([
            { $match: { project: new mongoose.Types.ObjectId(projectId) } },
            {
                $group: {
                    _id: {
                        user: '$user',
                        authorEmail: '$meta.authorEmail',
                        authorName: '$meta.authorName'
                    },
                    totalCount: { $sum: 1 },
                    totalWeight: { $sum: '$weight' },
                    breakdown: { $push: '$type' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.user',
                    foreignField: '_id',
                    as: 'userDoc'
                }
            }
        ])

        const summary = rawSummary.map((item) => {
            const registeredUser = item.userDoc && item.userDoc[0]
            if (registeredUser) {
                delete registeredUser.password
                return {
                    _id: registeredUser._id,
                    user: registeredUser,
                    totalCount: item.totalCount,
                    totalWeight: item.totalWeight,
                    breakdown: item.breakdown
                }
            } else {
                return {
                    _id: item._id.authorEmail || item._id.authorName || 'external',
                    user: {
                        _id: null,
                        name: item._id.authorName || 'External Committer',
                        email: item._id.authorEmail || '',
                        avatar: ''
                    },
                    isExternal: true,
                    totalCount: item.totalCount,
                    totalWeight: item.totalWeight,
                    breakdown: item.breakdown
                }
            }
        })

        res.json(summary)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

export const toggleReaction = async (req, res) => {
  try {
    const { id } = req.params
    const { emoji } = req.body

    const contribution = await Contribution.findById(id)
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' })

    const existingIndex = contribution.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    )

    if (existingIndex > -1) {
      contribution.reactions.splice(existingIndex, 1)
    } else {
      contribution.reactions.push({ user: req.user._id, emoji })
    }

    await contribution.save()
    const populated = await contribution.populate('user', 'name email avatar')

    req.io?.to(contribution.project.toString()).emit('contribution_updated', populated)
    res.json(populated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}