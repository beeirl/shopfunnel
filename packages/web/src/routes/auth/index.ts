import { checkDomain, getLastSeenWorkspaceId } from '@/routes/-common'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/')({
  server: {
    middleware: [checkDomain],
    handlers: {
      GET: async () => {
        try {
          const workspaceId = await getLastSeenWorkspaceId()
          if (!workspaceId) return redirect({ to: '/auth/authorize' })
          return redirect({ to: '/workspace/$workspaceId', params: { workspaceId } })
        } catch {
          return redirect({ to: '/auth/authorize' })
        }
      },
    },
  },
})
