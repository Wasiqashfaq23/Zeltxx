import "dotenv/config";
import express from "express"
import cors from 'cors'
import cookieParser from 'cookie-parser'
import {connectToMongo} from "./src/config/db.js"
import './src/config/passport.js'
import passport from 'passport'
import { errorHandler } from './src/middleware/errorHandler.js'
import authRoutes from './src/routes/auth.js'
import projectRoutes from './src/routes/project.js'



const app=express();
const PORT=process.env.PORT || 5000;


connectToMongo()

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())
app.use(passport.initialize())

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)


app.use(errorHandler)



app.get('/', (req, res) => res.json({ message: 'Server running' }))

app.listen(PORT || 5000, () =>
  console.log(`Server on port ${PORT || 5000}`)
)