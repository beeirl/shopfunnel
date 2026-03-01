import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/workspace/$workspaceId/analytics',
      params: { workspaceId: params.workspaceId },
    })
  },
})
