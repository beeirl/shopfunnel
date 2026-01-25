import { getLastSeenWorkspaceId } from '@/routes/-common'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/auth/')({
  server: {
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
