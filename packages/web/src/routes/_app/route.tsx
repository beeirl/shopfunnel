import { createFileRoute } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'

export const Route = createFileRoute('/_app')({
  server: {
    middleware: [
      createMiddleware().server(async ({ request, next }) => {
        const appStage = process.env.VITE_STAGE!
        const appDomain = process.env.VITE_DOMAIN!
        const host = request.headers.get('host')
        if (appStage === 'production' && !host?.endsWith(appDomain)) {
          return new Response('Not Found', { status: 404 })
        }
        return next()
      }),
    ],
  },
})
