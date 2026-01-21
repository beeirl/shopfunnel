import { AuthClient } from '@/context/auth'
import { useAuthSession } from '@/context/auth.session'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)

        const code = url.searchParams.get('code')
        if (!code) throw new Error('No code found')

        const result = await AuthClient.exchange(code, `${url.origin}${url.pathname}`)
        if (result.err) throw new Error(result.err.message)

        const decoded = AuthClient.decode(result.tokens.access, {} as any)
        if (decoded.err) throw new Error(decoded.err.message)

        const session = await useAuthSession()
        const accountId = decoded.subject.properties.accountId
        await session.update((value) => {
          return {
            ...value,
            account: {
              [accountId]: {
                id: accountId,
                email: decoded.subject.properties.email,
              },
            },
            current: accountId,
          }
        })

        const callback = (() => {
          const state = url.searchParams.get('state')
          if (state) {
            try {
              const result = JSON.parse(atob(state))
              if (result.callback && result.callback.startsWith('/')) {
                return result.callback
              }
            } catch {}
          }
          return '/auth'
        })()

        throw redirect({ to: callback })
      },
    },
  },
})
