import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * @brief Vite 설정 - GitHub Pages 배포용
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/2026-CSAT/',
  build: {
    outDir: '../docs',
    emptyOutDir: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
