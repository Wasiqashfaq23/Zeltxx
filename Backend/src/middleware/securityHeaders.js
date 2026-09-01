// Minimal security headers (Helmet replacement, zero dependencies).
export const securityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy': 'same-origin'
  })
  if (req.app?.get('env') === 'production') {
    res.set({
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    })
  }
  next()
}