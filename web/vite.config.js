import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * @brief Vite 설정
 * - 기본 빌드: 로컬 검증용 `web/dist`
 * - pages 모드: GitHub Pages 배포용 `docs`
 */
export default defineConfig(({ mode }) => {
  const isPagesBuild = mode === 'pages'

  return {
    plugins: [react(), tailwindcss()],
    base: '/2026-CSAT/',
    build: {
      outDir: isPagesBuild ? '../docs' : 'dist',
      emptyOutDir: !isPagesBuild
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  }
})
