import jwt from 'jsonwebtoken'
import User from '../models/user.js'
import { handleControllerError } from '../middleware/errorHandler.js'

export const googleCallback = (req, res) => {
  const token = jwt.sign(
    { id: req.user._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })

  res.redirect(process.env.CLIENT_URL + '/dashboard')
}

export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  })
  res.json({ message: 'Logged out' })
}

export const getMe = (req, res) => {
  res.json(req.user)
}

const clamp = (value, max) => {
  if (typeof value !== 'string') return value
  return value.trim().slice(0, max)
}

export const updateProfile = async (req, res) => {
  try {
    const { name, statusText, bio, avatar } = req.body
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ message: 'Name must be a non-empty string' })
    }
    if (avatar !== undefined && (typeof avatar !== 'string' || avatar.length > 2000)) {
      return res.status(400).json({ message: 'Avatar URL is too long' })
    }

    const userDoc = await User.findById(req.user._id)
    if (!userDoc) return res.status(404).json({ message: 'User not found' })

    if (name !== undefined) userDoc.name = clamp(name, 60)
    if (statusText !== undefined) userDoc.statusText = clamp(statusText, 80)
    if (bio !== undefined) userDoc.bio = clamp(bio, 500)
    if (avatar !== undefined) userDoc.avatar = avatar.trim()

    await userDoc.save()
    res.json({ message: 'Profile updated', user: userDoc })
  } catch (err) {
    handleControllerError(res, err)
  }
}