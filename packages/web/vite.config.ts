import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'
import { nitro } from 'nitro/vite'

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['cloudflare:workers'],
    },
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart({
      router: {
        generatedRouteTree: '../gen/routeTree.gen.ts',
      },
    }),
    nitro({
      preset: 'cloudflare-module',
    }),
    react(),
    tailwindcss(),
  ],
})
