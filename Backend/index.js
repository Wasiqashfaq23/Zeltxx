import "dotenv/config";
import express from "express"
import cors from 'cors'
import cookieParser from 'cookie-parser'

import {connectToMongo} from "./src/config/db.js"

const app=express();
const PORT=process.env.PORT || 5000;


connectToMongo()

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())


app.get('/', (req, res) => res.json({ message: 'Server running' }))

app.listen(PORT || 5000, () =>
  console.log(`Server on port ${PORT || 5000}`)
)