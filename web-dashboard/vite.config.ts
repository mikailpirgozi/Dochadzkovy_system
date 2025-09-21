import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      // Define environment variables
      'import.meta.env.VITE_API_URL': JSON.stringify(
        env.VITE_API_URL || 'https://backend-api-production-03aa.up.railway.app/api'
      ),
      'import.meta.env.VITE_ENABLE_DEVTOOLS': JSON.stringify(
        env.VITE_ENABLE_DEVTOOLS || 'true'
      ),
    },
  }
})
