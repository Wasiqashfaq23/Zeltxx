import express from 'express'
import passport from 'passport'
import { protect } from '../middleware/auth.js'
import { googleCallback, logout, getMe } from '../controllers/user.js'

const router = express.Router()

router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
)

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false
  }),
  googleCallback
)

router.post('/logout', logout)

router.get('/me', protect, getMe)

export default router