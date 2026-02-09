import { useAuthSession } from '@/context/auth.session'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/auth/logout')({
  server: {
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
