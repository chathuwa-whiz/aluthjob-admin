import react from '@vitejs/plugin-react'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'

// In development the browser talks to its own origin and Vite forwards /api to the API on :4000, so the session
// cookie is first-party. A production build calls the API directly (VITE_API_URL, see .env.production); the API
// must list this site's address in FRONTEND_URL.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const api = { '/api': { target: env.VITE_DEV_API || 'http://localhost:4000', changeOrigin: true } }

  return {
    plugins: [react()],
    server: { port: 3001, strictPort: true, proxy: api },
    preview: { port: 3001, strictPort: true, proxy: api },
    build: { sourcemap: false },
  }
})
