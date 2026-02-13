import { createFileRoute, Outlet } from '@tanstack/react-router'
import { checkBillingQueryOptions, checkOnboardingQueryOptions } from '../../-common'

export const Route = createFileRoute('/_app/workspace/$workspaceId/funnels/$id')({
  component: () => <Outlet />,
  beforeLoad: async ({ context, params }) => {
    await context.queryClient.fetchQuery(checkOnboardingQueryOptions(params.workspaceId))
    await context.queryClient.fetchQuery(checkBillingQueryOptions(params.workspaceId))
  },
})
