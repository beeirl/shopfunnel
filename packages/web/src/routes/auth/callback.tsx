import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthClient } from '@/context/auth'
import { useAuthSession } from '@/context/auth.session'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        if (!code) throw new Error('No code found')
        const result = await AuthClient.exchange(code, `${url.origin}${url.pathname}`)
        if (result.err) {
          throw new Error(result.err.message)
        }
        const decoded = AuthClient.decode(result.tokens.access, {} as any)
        if (decoded.err) throw new Error(decoded.err.message)
        const session = await useAuthSession()
        const id = decoded.subject.properties.accountID
        await session.update((value) => {
          return {
            ...value,
            account: {
              [id]: {
                id,
                email: decoded.subject.properties.email,
              },
            },
            current: id,
          }
        })
        throw redirect({ to: '/auth' })
      },
    },
  },
})
