import { Button } from '@/components/ui/button'
import { IconX as XIcon } from '@tabler/icons-react'
import { createFileRoute, redirect, useCanGoBack, useNavigate, useParams, useRouter } from '@tanstack/react-router'
import { checkOnboarding, getBillingQueryOptions } from './-common'
import { PricingTable } from './-components/pricing-table'

export const Route = createFileRoute('/_app/workspace/$workspaceId/downgrade')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await checkOnboarding({ data: params.workspaceId })
    const billing = await context.queryClient.ensureQueryData(getBillingQueryOptions(params.workspaceId))
    if (!billing.stripeSubscriptionId) throw redirect({ from: Route.fullPath, to: '../subscribe' })
    if (billing.pendingPlan) throw redirect({ from: Route.fullPath, to: '..' })
  },
})

function RouteComponent() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const navigate = useNavigate()
  const params = useParams({ from: '/_app/workspace/$workspaceId' })

  return (
    <div className="relative">
      <div className="absolute top-2 left-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (canGoBack) {
              router.history.back()
            } else {
              navigate({ to: '/workspace/$workspaceId', params })
            }
          }}
        >
          <XIcon />
        </Button>
      </div>
      <PricingTable mode="downgrade" />
    </div>
  )
}
