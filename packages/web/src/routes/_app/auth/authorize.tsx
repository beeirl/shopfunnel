import { AuthClient } from '@/context/auth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/auth/authorize')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const callback = url.searchParams.get('callback')

        const redirectUrl = new URL('./callback', request.url)
        const result = await AuthClient.authorize(redirectUrl.toString(), 'code')

        const authUrl = new URL(result.url)
        const state = btoa(
          JSON.stringify({
            challenge: result.challenge.state,
            callback: callback?.startsWith('/') ? callback : undefined,
          }),
        )
        authUrl.searchParams.set('state', state)

        return Response.redirect(authUrl.toString(), 302)
      },
    },
  },
})
