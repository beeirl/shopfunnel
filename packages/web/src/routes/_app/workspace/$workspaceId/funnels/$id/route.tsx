import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getBillingGateQueryOptions, getOnboardingGateQueryOptions } from '../../-common'

export const Route = createFileRoute('/_app/workspace/$workspaceId/funnels/$id')({
  component: () => <Outlet />,
  beforeLoad: async ({ context, params }) => {
    await context.queryClient.fetchQuery(getOnboardingGateQueryOptions(params.workspaceId))
    await context.queryClient.fetchQuery(getBillingGateQueryOptions(params.workspaceId))
  },
})
