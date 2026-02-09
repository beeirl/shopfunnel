import { createFileRoute } from '@tanstack/react-router'
import { checkOnboarding, getBillingQueryOptions } from './-common'
import { BillingPage } from './-components/billing-page'

export const Route = createFileRoute('/_app/workspace/$workspaceId/subscribe')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await checkOnboarding({ data: params.workspaceId })
    await context.queryClient.ensureQueryData(getBillingQueryOptions(params.workspaceId))
  },
})

function RouteComponent() {
  return <BillingPage title="Choose your plan" subtitle="Get more sessions as your shop grows" />
}
