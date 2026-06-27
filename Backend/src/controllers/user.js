import jwt from 'jsonwebtoken'

export const googleCallback = (req, res) => {
  const token = jwt.sign(
    { id: req.user._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })

  res.redirect(process.env.CLIENT_URL + '/dashboard')
}

export const logout = (req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Logged out' })
}

export const getMe = (req, res) => {
  res.json(req.user)
}