import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The API port must match bin/dev (API_PORT, default 3001). Port 3000 is
// deliberately avoided: `next dev` claims it by default and the portfolio
// app already runs there.
const apiPort = process.env.VITE_API_PORT ?? '3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Same-origin in the browser, so there is no CORS and no hardcoded
      // host/port in the client bundle.
      '/api': {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
})
