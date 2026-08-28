import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const backendUrl = env.BACKEND_URL || env.VITE_BACKEND_URL || env.VITE_API_URL || 'http://localhost:5001'

  return {
    define: {
      'import.meta.env.BACKEND_URL': JSON.stringify(backendUrl)
    },
    plugins: [react()],
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
