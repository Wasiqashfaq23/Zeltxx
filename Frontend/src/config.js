// Single source of truth for the backend base URL.
// Configure via vite build-time define (BACKEND_URL) or env vars
// (VITE_BACKEND_URL / VITE_API_URL). The localhost fallback is dev-only;
// production builds must provide a real API origin.
const getBackendUrl = () => {
  const url =
    import.meta.env.BACKEND_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5001' : '')
  return url.replace(/\/$/, '')
}

export const backendUrl = getBackendUrl()
export const googleAuthUrl = `${backendUrl}/api/auth/google`