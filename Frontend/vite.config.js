import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Origin of the API the SPA talks to (used to allow it in the production CSP).
const apiOriginOf = (url) => {
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

// The committed index.html ships the production policy (self-only). This plugin
// rewrites it per mode: the dev server additionally needs same-origin HMR (ws:)
// and a direct socket / uploads connection to http://localhost:5001, while
// production builds inject the real API origin into connect-src / img-src so
// axios + Socket.IO can reach api.yourdomain.com.
const cspPlugin = (backendUrl) => {
  const apiOrigin = apiOriginOf(backendUrl)
  const prodConnect = ["'self'", 'wss:', apiOrigin, 'https://accounts.google.com', 'https://www.googleapis.com']
    .filter(Boolean)
    .join(' ')
  const prodImg = ["'self'", 'data:', 'blob:', apiOrigin, 'https:'].filter(Boolean).join(' ')
  const prodCsp = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src ${prodImg}; connect-src ${prodConnect}; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'`
  const devCsp =
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: http://localhost:* https:; connect-src 'self' ws: wss: http://localhost:* https://accounts.google.com https://www.googleapis.com; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'"

  return {
    name: 'inject-mode-csp',
    transformIndexHtml(html, ctx) {
      const csp = ctx.server ? devCsp : prodCsp
      return html.replace(
        /<meta\s+http-equiv="Content-Security-Policy"[^>]*>/,
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />`
      )
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const backendUrl =
    env.BACKEND_URL ||
    env.VITE_BACKEND_URL ||
    env.VITE_API_URL ||
    (mode === 'production' ? '' : 'http://localhost:5001')

  if (mode === 'production' && !backendUrl) {
    throw new Error('VITE_API_URL (or BACKEND_URL) must be set when building for production')
  }

  return {
    define: {
      'import.meta.env.BACKEND_URL': JSON.stringify(backendUrl)
    },
    plugins: [react(), cspPlugin(backendUrl)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      },
      dedupe: ['react', 'react-dom']
    },
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          credentials: true
        }
      }
    }
  }
})
