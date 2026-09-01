// Origin-based CSRF defense for cookie-authenticated, browser-driven requests.
//
// JWT lives in a SameSite=None httpOnly cookie (required for cross-site deploys),
// which means a malicious site could POST to this API while the cookie is sent.
// For every "unsafe" method we require an Origin that matches the whitelist.
// Automated clients (curl, GitHub webhooks, CI) omit the Origin header and are
// still protected where it matters (webhook HMAC, PAT scoped sync, etc.).

const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

export const csrfProtection = (allowedOrigins = []) => {
  return (req, res, next) => {
    if (!UNSAFE_METHODS.includes(req.method.toUpperCase())) return next()

    const origin = req.headers.origin
    if (!origin) return next() // non-browser client

    if (allowedOrigins.includes(origin)) return next()
    return res.status(403).json({ error: 'Request blocked: cross-site origin not allowed.' })
  }
}