import { createFileRoute, redirect } from '@tanstack/react-router'
import { getLastSeenWorkspaceId } from '../-common'

export const Route = createFileRoute('/auth/')({
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
