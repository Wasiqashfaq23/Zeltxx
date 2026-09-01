import { Router } from 'express'
import crypto from 'crypto'
import Project from '../models/project.js'
import { handleGitHubWebhook } from '../controllers/webhook.js'

const router = Router()

/**
 * Verifies the GitHub payload signature (X-Hub-Signature-256) using the
 * project's generated webhook secret. Fails closed: payloads without a
 * configured secret or a valid HMAC are rejected before reaching the handler.
 */
const verifyGitHubSignature = async (req, res, next) => {
  try {
    const { projectId } = req.params
    const project = await Project.findById(projectId).select('+webhookSecret')
    if (!project) return res.status(404).json({ error: 'Project not found' })

    if (!project.webhookSecret) {
      return res.status(403).json({
        error: 'No webhook secret configured for this project. Generate one in Project Settings and re-add the webhook in GitHub.'
      })
    }

    const provided = req.headers['x-hub-signature-256'] || ''
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}))
    const expected = 'sha256=' + crypto.createHmac('sha256', project.webhookSecret).update(raw).digest('hex')

    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Invalid webhook signature.' })
    }

    next()
  } catch (err) {
    next(err)
  }
}

router.post('/github/:projectId', verifyGitHubSignature, handleGitHubWebhook)

export default router