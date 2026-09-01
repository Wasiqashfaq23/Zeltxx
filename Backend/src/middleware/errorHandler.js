export const errorHandler = (err, req, res, _next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.values(err.errors).map((e) => e.message)
    })
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for ${err.path}: ${err.value}` })
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' })
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body contains invalid JSON.' })
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' })
  }

  const status = err.status || err.statusCode || 500
  const isProduction = process.env.NODE_ENV === 'production'

  if (status >= 500) {
    console.error('Unhandled error:', err)
  }

  res.status(status).json({
    error: isProduction && status >= 500 ? 'Internal server error. Please try again later.' : err.message || 'Internal server error'
  })
}

/**
 * Last-resort error response for controllers so client-visible 500s never
 * leak internal error messages. Cast/Validation errors map to 400.
 */
export const handleControllerError = (res, err) => {
  const isBadInput = err.name === 'CastError' || err.name === 'ValidationError'
  const status = isBadInput ? 400 : 500
  if (status >= 500) console.error('Handler error:', err)
  res.status(status).json({ message: isBadInput ? err.message : 'Internal server error' })
}