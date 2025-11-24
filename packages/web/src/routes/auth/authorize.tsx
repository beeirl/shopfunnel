import { createFileRoute } from '@tanstack/react-router'
import { AuthClient } from '@/context/auth'

export const Route = createFileRoute('/auth/authorize')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const result = await AuthClient.authorize(new URL('./callback', request.url).toString(), 'code')
        return Response.redirect(result.url, 302)
      },
    },
  },
})
