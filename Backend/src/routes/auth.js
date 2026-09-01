import crypto from 'crypto'
import express from 'express'
import passport from 'passport'
import { protect } from '../middleware/auth.js'
import { googleCallback, logout, getMe, updateProfile } from '../controllers/auth.js'

const router = express.Router()

// Stateless CSRF protection for the OAuth flow: a random `state` is issued on
// the /google route, stored in a short-lived httpOnly cookie, and verified
// (timing-safe) before the callback can exchange the authorization code.
const STATE_COOKIE = 'oauthState'
const STATE_TTL_MS = 10 * 60 * 1000

const timingSafeEqualString = (a, b) => {
  const bufA = Buffer.from(String(a || ''))
  const bufB = Buffer.from(String(b || ''))
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

const clearStateCookie = (res) =>
  res.clearCookie(STATE_COOKIE, { httpOnly: true, secure: true, sameSite: 'lax' })

router.get('/google', (req, res, next) => {
  const state = crypto.randomBytes(16).toString('hex')
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: STATE_TTL_MS
  })
  const authenticator = passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state
  })
  authenticator(req, res, next)
})

router.get('/google/callback',
  (req, res, next) => {
    const expected = req.cookies?.[STATE_COOKIE]
    clearStateCookie(res)
    if (!expected || !req.query.state || !timingSafeEqualString(req.query.state, expected)) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=invalid_oauth_state`)
    }
    next()
  },
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false
  }),
  googleCallback
)

router.post('/logout', logout)

router.get('/me', protect, getMe)
router.patch('/profile', protect, updateProfile)

export default router