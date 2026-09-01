import "dotenv/config";
import express from "express"
import cors from 'cors'
import http from 'http'
import path from 'path'
import fs from 'fs'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import {connectToMongo} from "./src/config/db.js"
import './src/config/passport.js'
import passport from 'passport'
import { startDailySnapshot } from './src/jobs/dailySnapshot.js'
import { startWeeklyDigest } from './src/jobs/weeklyDigest.js'
import { startDueDateReminders } from './src/jobs/dueDateReminder.js'
import { startRecurringTasks } from './src/jobs/recurringTasks.js'
import { errorHandler } from './src/middleware/errorHandler.js'
import { csrfProtection } from './src/middleware/csrf.js'
import { securityHeaders } from './src/middleware/securityHeaders.js'
import { createRateLimiter } from './src/middleware/rateLimiter.js'
import { initSocket } from './src/socket/index.js'
import authRoutes from './src/routes/auth.js'
import projectRoutes from './src/routes/project.js'
import contributionRoutes from "./src/routes/contribution.js"
import snapshotRoutes from "./src/routes/snapshot.js";
import notificationRoutes from './src/routes/notifications.js'
import taskRoutes from './src/routes/task.js'
import chatRoutes from './src/routes/chat.js'
import resourceRoutes from './src/routes/resource.js'
import webhookRoutes from './src/routes/webhook.js'
import githubRoutes from './src/routes/github.js'
import searchRoutes from './src/routes/search.js'
import sprintRoutes from './src/routes/sprint.js'

// ---- Trusted browser origins (CSRF + CORS). Override via CORS_ORIGINS=---
const buildAllowedOrigins = () => {
  const fromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const client = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : []
  const defaults =
    process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:5173', 'http://localhost:3000']
  return [...new Set([...defaults, ...fromEnv, ...client])]
}

const allowedOrigins = buildAllowedOrigins()

const app = express();
const httpServer = http.createServer(app)
const PORT = process.env.PORT || 5001;
const io = initSocket(httpServer, allowedOrigins)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Only trust proxy headers when the app is deployed behind a known reverse
// proxy / load balancer. When set, the rate limiter bases req.ip on X-Forwarded-For,
// which is spoofable if the server is directly reachable without one.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY)
  app.set('trust proxy', Number.isFinite(hops) && hops ? hops : true)
}
connectToMongo()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Hub-Signature-256', 'X-GitHub-Event']
  })
)
// Webhook payloads (large GitHub pushes) can exceed Express's default 100kb body limit.
app.use('/api/webhooks', express.json({ limit: '1mb', verify: (req, res, buf) => { req.rawBody = buf } }))
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }))
app.use(cookieParser())

// Serve locally-stored attachment fallbacks (Cloudinary is used when configured).
const localUploadsDir = path.resolve(__dirname, 'uploads')
fs.mkdirSync(localUploadsDir, { recursive: true })
app.use('/uploads', express.static(localUploadsDir))
app.use(passport.initialize())
app.use(securityHeaders)
app.use((req, res, next) => { req.io = io; next() })

app.get(['/health', '/api/health'], (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    service: 'Zeltxx SaaS API',
    db: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Liveness probe: always 200 while the process responds, no DB dependency.
// Used as Render's healthCheckPath so free instances stay awake (Render pings it
// continuously) without flapping when Mongo is briefly unreachable.
app.get(['/health/live', '/api/health/live'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Zeltxx SaaS API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Origin-based CSRF guard for every cookie-authenticated mutation.
app.use('/api', csrfProtection(allowedOrigins))

// ---- Route-level rate limits ----
const authLimiter = createRateLimiter({ windowMs: 60000, max: 40, message: 'Too many auth requests.' })
const webhookLimiter = createRateLimiter({ windowMs: 60000, max: 600, message: 'Webhook storm detected.' })
const githubSyncLimiter = createRateLimiter({ windowMs: 60000, max: 30, message: 'Too many sync requests. Try again in a minute.' })
const contributionLimiter = createRateLimiter({ windowMs: 60000, max: 30, message: 'Too many contributions logged.' })

app.use('/api/auth', authLimiter)
app.use('/api/webhooks', webhookLimiter)
app.use('/api/github', githubSyncLimiter)
app.use('/api/contributions', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return contributionLimiter(req, res, next)
  return next()
})

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/contributions', contributionRoutes)
app.use('/api/snapshots', snapshotRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/resources', resourceRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/github', githubRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/sprints', sprintRoutes)

app.use(errorHandler)

startDailySnapshot()
startWeeklyDigest()
startDueDateReminders(io)
startRecurringTasks()

httpServer.listen(PORT, () =>
  console.log(`Server on port ${PORT}`)
)