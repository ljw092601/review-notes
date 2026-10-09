/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 자주 안 바뀌는 라이브러리는 따로 묶어 캐시가 오래 가게 하고, 초기 청크를 500KB 아래로 유지한다
        manualChunks(id) {
          const path = id.split('\\').join('/')
          if (!path.includes('/node_modules/')) return undefined
          const pkg = path.split('/node_modules/').pop()!.split('/')[0]
          if (['react', 'react-dom', 'scheduler'].includes(pkg)) return 'react'
          if (['react-router', 'react-router-dom'].includes(pkg)) return 'router'
          if (pkg === 'dexie') return 'dexie'
          if (pkg === 'zod') return 'zod'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
})
