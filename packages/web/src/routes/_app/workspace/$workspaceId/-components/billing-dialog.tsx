import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { withActor } from '@/context/auth.withActor'
import { Billing } from '@shopfunnel/core/billing/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconSettings as SettingsIcon } from '@tabler/icons-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { getBillingQueryOptions, getUsageQueryOptions, PLANS } from '../-common'

const createPortalUrl = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      returnUrl: z.string(),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Billing.generatePortalUrl({ returnUrl: data.returnUrl }), data.workspaceId)
  })

export function BillingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const params = useParams({ from: '/_app/workspace/$workspaceId' })

  const billingQuery = useSuspenseQuery(getBillingQueryOptions(params.workspaceId))
  const billing = billingQuery.data

  const usageQuery = useSuspenseQuery(
    getUsageQueryOptions(params.workspaceId, billing.lastSubscribedAt?.toISOString() ?? null),
  )
  const usage = usageQuery.data

  const currentPlan = PLANS.find((p) => p.id === billing.plan)
  const sessionLimit = currentPlan?.sessions ?? 0

  const planCost = (() => {
    if (!currentPlan || !currentPlan.monthlyPrice) return '$0'
    if (billing.interval === 'year' && currentPlan.yearlyPrice) {
      return `$${currentPlan.yearlyPrice}/year`
    }
    return `$${currentPlan.monthlyPrice}/month`
  })()

  const daysRemaining =
    billing.onTrial && billing.trialEndsAt
      ? Math.ceil((new Date(billing.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

  const [isRedirecting, setIsRedirecting] = React.useState(false)

  const handleManageSubscription = async () => {
    setIsRedirecting(true)
    try {
      const url = await createPortalUrl({
        data: {
          workspaceId: params.workspaceId,
          returnUrl: window.location.href,
        },
      })
      window.location.href = url
    } catch {
      setIsRedirecting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="sm:max-w-md">
        <Dialog.Title>Billing</Dialog.Title>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">You can manage your billing information and subscription here</p>

          <div className="flex items-center justify-between rounded-xl border border-border p-2.5 pl-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{currentPlan?.name ?? 'Free'}</p>
              {billing.onTrial && <Badge variant="secondary">Trial</Badge>}
            </div>
            <Button
              size="sm"
              render={<Link to="/workspace/$workspaceId/upgrade" params={{ workspaceId: params.workspaceId }} />}
              onClick={() => onOpenChange(false)}
            >
              Upgrade
            </Button>
          </div>

          <div className="flex flex-col border-t border-border">
            {[
              {
                label: 'Sessions',
                value: `${usage.sessions.toLocaleString()} / ${sessionLimit.toLocaleString()}`,
              },
              {
                label: 'Plan cost',
                value: planCost,
              },
              ...(daysRemaining !== null
                ? [
                    {
                      label: 'Remaining days in trial',
                      value: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`,
                    },
                  ]
                : []),
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-border py-2">
                <p className="text-sm text-foreground">{row.label}</p>
                <p className="text-sm font-medium text-foreground">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        {billing.stripeCustomerId && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleManageSubscription} disabled={isRedirecting}>
              {isRedirecting ? <Spinner /> : <SettingsIcon />}
              Manage subscription
            </Button>
          </div>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}
