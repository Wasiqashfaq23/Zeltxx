import jwt from 'jsonwebtoken'

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

export const updateProfile = async (req, res) => {
  try {
    const { name, statusText, bio, avatar } = req.body
    const userDoc = await User.findById(req.user._id)
    if (!userDoc) return res.status(404).json({ message: 'User not found' })

    if (name !== undefined) userDoc.name = name
    if (statusText !== undefined) userDoc.statusText = statusText
    if (bio !== undefined) userDoc.bio = bio
    if (avatar !== undefined) userDoc.avatar = avatar

    await userDoc.save()
    res.json(userDoc)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}