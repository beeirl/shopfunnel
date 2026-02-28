import { useAuthSession } from '@/context/auth.session'
import { checkDomain } from '@/routes/-common'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/logout')({
  server: {
    middleware: [checkDomain],
    handlers: {
      GET: async () => {
        const auth = await useAuthSession()
        const current = auth.data.current
        if (current) {
          await auth.update((val) => {
            delete val.account?.[current]
            const first = Object.keys(val.account ?? {})[0]
            return {
              ...val,
              current: first,
            }
          })
        }
        return redirect({ to: '/auth' })
      },
    },
  },
})
