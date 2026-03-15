import { getSessionQueryOptions } from '@/routes/workspace/$workspaceId/-common'
import { listVariantsQueryOptions } from '@/routes/workspace/$workspaceId/funnels/$id/-common'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getExperimentQueryOptions } from './-common'

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel/experiments/$experimentId')({
  component: () => <Outlet />,
  beforeLoad: async ({ context, params }) => {
    const session = await context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId))
    if (!session.isAdmin) {
      throw redirect({ to: '/workspace/$workspaceId/funnels/$id/responses', params })
    }
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        getExperimentQueryOptions({ workspaceId: params.workspaceId, experimentId: params.experimentId }),
      ),
      context.queryClient.ensureQueryData(
        listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
      ),
    ])
  },
})
