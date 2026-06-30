import "dotenv/config";
import express from "express"
import cors from 'cors'
import http from 'http'
import cookieParser from 'cookie-parser'
import {connectToMongo} from "./src/config/db.js"
import './src/config/passport.js'
import passport from 'passport'
import { startDailySnapshot } from './src/jobs/dailySnapshot.js'
import { errorHandler } from './src/middleware/errorHandler.js'
import { initSocket } from './src/socket/index.js'
import authRoutes from './src/routes/auth.js'
import projectRoutes from './src/routes/project.js'
import contributionRoutes from "./src/routes/contribution.js"
import snapshotRoutes from "./src/routes/snapshot.js";
import notificationRoutes from './src/routes/notifications.js'


const app=express();
const httpServer = http.createServer(app)
const PORT=process.env.PORT || 5000;
const io = initSocket(httpServer)


connectToMongo()

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())
app.use(passport.initialize())


app.use((req, res, next) => { req.io = io; next() })


app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/contributions', contributionRoutes)
app.use('/api/snapshots',     snapshotRoutes)
app.use('/api/notifications', notificationRoutes)


app.use(errorHandler)

startDailySnapshot()


httpServer.listen(PORT || 5000, () =>
  console.log(`Server on port ${PORT || 5000}`)
)