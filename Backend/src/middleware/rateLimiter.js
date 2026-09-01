// In-memory sliding-window rate limiter. Single-process, dependency-free.
// Persist to Redis later if the app is ever scaled horizontally.

const windows = new Map() // key -> array of timestamps (ms)

const normalizeKey = (ip, route) => {
  if (!ip) return `anon:${route}`
  const clean = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  return `${clean}:${route}`
}

const cleanup = () => {
  const now = Date.now()
  for (const [key, hits] of windows) {
    const recent = hits.filter((t) => now - t < removalsWindow)
    if (recent.length === 0) windows.delete(key)
    else windows.set(key, recent)
  }
}

const removalsWindow = 60000
setInterval(cleanup, 60000).unref?.()

/**
 * createRateLimiter({ windowMs, max, message })
 */
export const createRateLimiter = ({ windowMs = 60000, max = 100, message = 'Too many requests, please slow down.' } = {}) => {
  return (req, res, next) => {
    const key = normalizeKey(req.ip, req.originalUrl || req.path)
    const now = Date.now()
    const hits = (windows.get(key) || []).filter((t) => now - t < windowMs)

    const resetAt = hits.length ? hits[0] + windowMs : now + windowMs
    res.set('X-RateLimit-Limit', String(max))
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - hits.length)))
    res.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))

    if (hits.length >= max) {
      res.set('Retry-After', String(Math.ceil((resetAt - now) / 1000)))
      return res.status(429).json({ error: message })
    }

    hits.push(now)
    windows.set(key, hits)
    next()
  }
}