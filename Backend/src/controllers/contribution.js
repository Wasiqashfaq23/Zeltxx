import mongoose from 'mongoose'
import Contribution from "../models/contribution.js"
import Project from "../models/project.js"
import Snapshot from '../models/snapshot.js'
import { MANUAL_CONTRIBUTION_TYPES } from '../config/constants.js'
import { logContributionEvent, sanitizeMeta } from '../services/contribution.service.js'
import { isMember } from '../services/membership.js'
import { handleControllerError } from '../middleware/errorHandler.js'

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value)

const toDateKey = (d) => {
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

const computeStreaks = (dateKeys) => {
  const unique = [...new Set(dateKeys)].sort()
  if (!unique.length) return { current: 0, longest: 0 }

  let longest = 1
  let run = 1
  for (let i = 1; i < unique.length; i++) {
    const diffDays = Math.round((new Date(unique[i]) - new Date(unique[i - 1])) / 86400000)
    if (diffDays === 1) run += 1
    else run = 1
    if (run > longest) longest = run
  }

  const today = toDateKey(new Date())
  const yesterday = toDateKey(new Date(Date.now() - 86400000))
  const last = unique[unique.length - 1]
  let current = 0
  if (last === today || last === yesterday) {
    current = 1
    for (let i = unique.length - 2; i >= 0; i--) {
      if (Math.round((new Date(unique[i + 1]) - new Date(unique[i])) / 86400000) === 1) current += 1
      else break
    }
  }

  return { current, longest }
}

const buildSummaryAggregation = (match) =>
  Contribution.aggregate([
    { $match: match },
    // Pre-aggregate per (user, type) so the summary only ever holds
    // (users × types) documents in memory instead of every contribution row.
    {
      $group: {
        _id: {
          user: '$user',
          authorEmail: '$meta.authorEmail',
          authorName: '$meta.authorName',
          type: '$type'
        },
        countByType: { $sum: 1 },
        weightByType: { $sum: '$weight' }
      }
    },
    {
      $group: {
        _id: {
          user: '$_id.user',
          authorEmail: '$_id.authorEmail',
          authorName: '$_id.authorName'
        },
        totalCount: { $sum: '$countByType' },
        totalWeight: { $sum: '$weightByType' },
        typeCounts: { $push: { k: '$_id.type', v: '$countByType' } }
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

// Fans typeCounts back out into the flat `breakdown` array the charts expect.
const expandBreakdown = (typeCounts) =>
  (typeCounts || []).flatMap(({ k, v }) => Array.from({ length: v }, () => k))

const mapRawSummary = (rawSummary) =>
  rawSummary.map((item) => {
    const registeredUser = item.userDoc && item.userDoc[0]
    if (registeredUser) {
      delete registeredUser.password
      return {
        _id: registeredUser._id,
        user: registeredUser,
        totalCount: item.totalCount,
        totalWeight: item.totalWeight,
        breakdown: expandBreakdown(item.typeCounts)
      }
    }
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
      breakdown: expandBreakdown(item.typeCounts)
    }
  })

const rangeMatch = (range, base = {}) => {
  if (range !== '7' && range !== '30') return base
  const since = new Date()
  since.setDate(since.getDate() - Number(range))
  return { ...base, createdAt: { $gte: since } }
}

const requireProjectMember = async (res, projectId, userId) => {
  const project = await Project.findById(projectId)
  if (!project) {
    res.status(404).json({ message: 'Project not found' })
    return null
  }
  if (!isMember(project, userId)) {
    res.status(403).json({ message: 'Not a member of this project' })
    return null
  }
  return project
}

export const logContribution = async (req, res) => {
  try {
    const { projectId, type, meta } = req.body

    if (!projectId || !isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId. Please provide a valid MongoDB ObjectId.' })
    }

    if (!MANUAL_CONTRIBUTION_TYPES.includes(type)) {
      return res.status(400).json({
        message: `"${type}" cannot be logged manually. It is recorded automatically (git sync, webhook, task completion, resource upload). You may log: ${MANUAL_CONTRIBUTION_TYPES.join(', ')}.`
      })
    }

    const project = await requireProjectMember(res, projectId, req.user._id)
    if (!project) return

    const contribution = await logContributionEvent({
      projectId,
      userId: req.user._id,
      type,
      meta: sanitizeMeta(meta && typeof meta === 'object' ? meta : { note: typeof meta === 'string' ? meta : '' }),
      io: req.io,
      enforceDailyCap: true
    })

    if (!contribution) {
      return res.status(200).json({ message: 'Daily cap reached for this contribution type. Try again tomorrow.', skipped: true })
    }
    res.status(201).json(contribution)
  } catch (error) {
    handleControllerError(res, error)
  }
}

export const getContribution = async (req, res) => {
  try {
    const { projectId } = req.params
    if (!projectId || !isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId. Please provide a valid MongoDB ObjectId.' })
    }

    const project = await requireProjectMember(res, projectId, req.user._id)
    if (!project) return

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200)
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)

    const total = await Contribution.countDocuments({ project: projectId })
    const contributions = await Contribution.find({ project: projectId })
      .populate('user', 'name email avatar statusText')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)

    res.status(200).json({
      contributions,
      total,
      limit,
      offset,
      hasMore: offset + contributions.length < total
    })
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const getProjectSummary = async (req, res) => {
  try {
    const { projectId } = req.params
    if (!projectId || !isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId. Please provide a valid MongoDB ObjectId.' })
    }

    const project = await requireProjectMember(res, projectId, req.user._id)
    if (!project) return

    const range = req.query.range
    const match = rangeMatch(range, { project: new mongoose.Types.ObjectId(projectId) })

    const rawSummary = await buildSummaryAggregation(match)

    res.json(mapRawSummary(rawSummary))
  } catch (error) {
    handleControllerError(res, error)
  }
}

export const getWorkspaceLeaderboard = async (req, res) => {
  try {
    const memberProjects = await Project.find(
      { members: { $elemMatch: { user: req.user._id } } },
      { _id: 1 }
    ).lean()
    if (!memberProjects.length) return res.json([])

    const match = rangeMatch(req.query.range, {
      project: { $in: memberProjects.map((p) => p._id) }
    })

    const rawSummary = await buildSummaryAggregation(match)
    res.json(mapRawSummary(rawSummary))
  } catch (error) {
    handleControllerError(res, error)
  }
}

export const getProjectStreaks = async (req, res) => {
  try {
    const { projectId } = req.params
    if (!projectId || !isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId. Please provide a valid MongoDB ObjectId.' })
    }

    const project = await requireProjectMember(res, projectId, req.user._id)
    if (!project) return

    const grouped = await Snapshot.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId) } },
      { $group: { _id: '$user', dates: { $push: '$date' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDoc' } }
    ])

    const streaks = grouped.map((entry) => {
      const { current, longest } = computeStreaks(entry.dates.map(toDateKey).filter(Boolean))
      const userDoc = entry.userDoc && entry.userDoc[0]
      if (userDoc && userDoc.password) delete userDoc.password
      return {
        user: userDoc || { _id: entry._id, name: 'Unknown', email: '', avatar: '' },
        current,
        longest,
        activeDays: entry.dates.length
      }
    })

    res.json(streaks)
  } catch (error) {
    handleControllerError(res, error)
  }
}

export const exportProjectContributions = async (req, res) => {
  try {
    const { projectId } = req.params
    if (!projectId || !isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId.' })
    }

    const project = await requireProjectMember(res, projectId, req.user._id)
    if (!project) return

    const projectName = project.name.replace(/[",\r\n]/g, ' ')
    const contributions = await Contribution.find({ project: projectId })
      .populate('user', 'name email')
      .sort({ createdAt: 1 })
      .limit(10000)

    const escapeCell = (value) => {
      let s = String(value ?? '')
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
      return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s
    }

    const rows = [
      ['Date', 'User', 'Email', 'Type', 'Weight', 'Detail', 'URL'],
      ...contributions.map((c) => {
        const meta = c.meta || {}
        const detail = typeof meta === 'string' ? meta : meta.commitMsg || meta.note || meta.title || ''
        return [
          (c.createdAt || new Date()).toISOString().slice(0, 10),
          c.user?.name || meta.authorName || 'External',
          c.user?.email || meta.authorEmail || '',
          c.type,
          c.weight,
          detail,
          meta.url || ''
        ].map(escapeCell)
      })
    ]

    const csv = rows.map((row) => row.join(',')).join('\r\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(projectName)}-contributions.csv"`)
    res.send('\uFEFF' + csv)
  } catch (err) {
    handleControllerError(res, err)
  }
}

export const toggleReaction = async (req, res) => {
  try {
    const { id } = req.params
    const { emoji } = req.body

    if (typeof emoji !== 'string' || !emoji.trim() || emoji.length > 16) {
      return res.status(400).json({ message: 'Invalid emoji.' })
    }

    const contribution = await Contribution.findById(id)
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' })

    const project = await Project.findById(contribution.project)
    if (!isMember(project, req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this project' })
    }

    const existingIndex = contribution.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    )

    if (existingIndex > -1) {
      contribution.reactions.splice(existingIndex, 1)
    } else {
      contribution.reactions.push({ user: req.user._id, emoji: emoji.trim() })
    }

    await contribution.save()
    const populated = await contribution.populate('user', 'name email avatar')

    req.io?.to(contribution.project.toString()).emit('contribution_updated', populated)
    res.json(populated)
  } catch (err) {
    handleControllerError(res, err)
  }
}