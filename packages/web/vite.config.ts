import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['cloudflare:workers'],
    },
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths(),
    tanstackStart(),
    nitro({
      preset: 'cloudflare-module',
    }),
    svgr(),
    react(),
  ],
})
