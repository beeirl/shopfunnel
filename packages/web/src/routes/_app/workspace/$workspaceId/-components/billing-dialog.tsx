import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { withActor } from '@/context/auth.withActor'
import { snackbar } from '@/lib/snackbar'
import { Billing } from '@shopfunnel/core/billing/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconSettings as SettingsIcon } from '@tabler/icons-react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { ADDONS, formatPrice, getBillingQueryOptions, getUsageQueryOptions, PLANS } from '../-common'

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

const addAddon = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      addon: Billing.Addon,
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Billing.addAddon({ addon: data.addon }), data.workspaceId)
  })

const removeAddon = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      addon: Billing.Addon,
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Billing.removeAddon({ addon: data.addon }), data.workspaceId)
  })

const cancelDowngrade = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Billing.cancelDowngrade(), data.workspaceId)
  })

export function BillingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const params = useParams({ from: '/_app/workspace/$workspaceId' })
  const queryClient = useQueryClient()

  const billingQuery = useSuspenseQuery(getBillingQueryOptions(params.workspaceId))
  const billing = billingQuery.data

  const usageQuery = useSuspenseQuery(
    getUsageQueryOptions(params.workspaceId, billing.periodStartedAt?.toISOString() ?? null),
  )
  const usage = usageQuery.data

  const [isRedirecting, setIsRedirecting] = React.useState(false)
  const [isManagedAddonUpdating, setIsManagedAddonUpdating] = React.useState(false)
  const [isCancellingDowngrade, setIsCancellingDowngrade] = React.useState(false)
  const [addManagedDialogOpen, setAddManagedDialogOpen] = React.useState(false)
  const [removeManagedDialogOpen, setRemoveManagedDialogOpen] = React.useState(false)

  const currentPlan = PLANS.find((p) => p.id === billing.plan)
  const currentSessionLimit = currentPlan?.sessions ?? 0

  const currentPlanPrice = (() => {
    if (!currentPlan || !currentPlan.monthlyPrice) return '$0'
    if (billing.interval === 'year' && currentPlan.yearlyPrice) {
      return `$${currentPlan.yearlyPrice}/year`
    }
    return `$${currentPlan.monthlyPrice}/month`
  })()

  const managedAddon = ADDONS.find((a) => a.id === 'managed')!
  const managedAddonPrice =
    billing.interval === 'year'
      ? `${formatPrice(managedAddon.yearlyPrice)}/year`
      : `${formatPrice(managedAddon.monthlyPrice)}/month`

  const trialDaysRemaining =
    billing.onTrial && billing.trialEndsAt
      ? Math.ceil((new Date(billing.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

  const hasPendingDowngrade = !!billing.pendingPlan
  const pendingDowngradePlan = billing.pendingPlan ? PLANS.find((p) => p.id === billing.pendingPlan) : null
  const pendingDowngradeDate = billing.periodEndsAt
    ? new Date(billing.periodEndsAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
    : null
  const pendingDowngradePrice = (() => {
    if (!pendingDowngradePlan || !pendingDowngradePlan.monthlyPrice) return '$0'
    if (billing.interval === 'year' && pendingDowngradePlan.yearlyPrice) {
      return `$${pendingDowngradePlan.yearlyPrice}/year`
    }
    return `$${pendingDowngradePlan.monthlyPrice}/month`
  })()

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

  const handleAddManagedAddon = async () => {
    setIsManagedAddonUpdating(true)
    try {
      await addAddon({ data: { workspaceId: params.workspaceId, addon: 'managed' } })
      await queryClient.invalidateQueries({ queryKey: ['billing', params.workspaceId] })
      snackbar.add({ title: 'Managed service added', type: 'success' })
    } catch (error) {
      console.error('Failed to add managed addon:', error)
    } finally {
      setIsManagedAddonUpdating(false)
    }
  }

  const handleRemoveManagedAddon = async () => {
    setIsManagedAddonUpdating(true)
    try {
      await removeAddon({ data: { workspaceId: params.workspaceId, addon: 'managed' } })
      await queryClient.invalidateQueries({ queryKey: ['billing', params.workspaceId] })
      snackbar.add({ title: 'Managed service removed', type: 'success' })
    } catch (error) {
      console.error('Failed to remove managed addon:', error)
    } finally {
      setIsManagedAddonUpdating(false)
    }
  }

  const handleCancelDowngrade = async () => {
    setIsCancellingDowngrade(true)
    try {
      await cancelDowngrade({ data: { workspaceId: params.workspaceId } })
      await queryClient.invalidateQueries({ queryKey: ['billing', params.workspaceId] })
      snackbar.add({ title: 'Downgrade cancelled', type: 'success' })
    } catch (error) {
      console.error('Failed to cancel downgrade:', error)
    } finally {
      setIsCancellingDowngrade(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="sm:max-w-md">
        <Dialog.Title>Billing</Dialog.Title>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">You can manage your billing information and subscription here</p>

          <div className="flex flex-col rounded-xl border border-border shadow-xs">
            <div className="flex min-h-12 items-center justify-between p-2 pl-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{currentPlan?.name ?? 'Free'}</p>
                {billing.onTrial && <Badge variant="secondary">Trial</Badge>}
                {hasPendingDowngrade && <Badge variant="destructive">Downgraded</Badge>}
              </div>
              {hasPendingDowngrade ? (
                <Button size="sm" nativeButton={false} onClick={handleCancelDowngrade} disabled={isCancellingDowngrade}>
                  {isCancellingDowngrade && <Spinner />}
                  Cancel downgrade
                </Button>
              ) : (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link to="/workspace/$workspaceId/upgrade" params={{ workspaceId: params.workspaceId }} />}
                  onClick={() => onOpenChange(false)}
                >
                  Upgrade
                </Button>
              )}
            </div>
            {hasPendingDowngrade && pendingDowngradePlan && (
              <div className="flex min-h-12 items-center justify-between border-t border-border px-3 py-2">
                <p className="text-sm text-muted-foreground">
                  Will downgrade to <span className="font-medium text-foreground">{pendingDowngradePlan.name}</span> on{' '}
                  {pendingDowngradeDate}
                </p>
                <p className="text-sm font-medium text-foreground">{pendingDowngradePrice}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col border-t border-border">
            {[
              {
                label: 'Sessions',
                value: `${usage.sessions.toLocaleString()} / ${currentSessionLimit.toLocaleString()}`,
              },
              {
                label: 'Plan cost',
                value: currentPlanPrice,
              },
              ...(trialDaysRemaining !== null
                ? [
                    {
                      label: 'Remaining days in trial',
                      value: `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'day' : 'days'}`,
                    },
                  ]
                : []),
              {
                label: 'Managed service',
                value: (
                  <Button
                    size="sm"
                    variant={billing.managed ? 'outline' : 'default'}
                    disabled={isManagedAddonUpdating}
                    onClick={() => (billing.managed ? setRemoveManagedDialogOpen(true) : setAddManagedDialogOpen(true))}
                  >
                    {isManagedAddonUpdating && <Spinner />}
                    {billing.managed ? 'Remove' : 'Add'}
                  </Button>
                ),
              },
              ...(!hasPendingDowngrade && billing.stripeSubscriptionId && currentPlan && PLANS.indexOf(currentPlan) > 0
                ? [
                    {
                      label: 'Downgrade subscription',
                      value: (
                        <Button
                          size="sm"
                          variant="outline"
                          render={
                            <Link to="/workspace/$workspaceId/downgrade" params={{ workspaceId: params.workspaceId }} />
                          }
                          onClick={() => onOpenChange(false)}
                        >
                          Downgrade
                        </Button>
                      ),
                    },
                  ]
                : []),
            ].map((row) => (
              <div key={row.label} className="flex min-h-10 items-center justify-between border-b border-border">
                <p className="text-sm text-foreground">{row.label}</p>
                {typeof row.value === 'string' ? (
                  <p className="text-sm font-medium text-foreground">{row.value}</p>
                ) : (
                  row.value
                )}
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
        <AlertDialog.Root open={addManagedDialogOpen} onOpenChange={setAddManagedDialogOpen}>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Add {managedAddon.name}</AlertDialog.Title>
              <AlertDialog.Description>
                This will add {managedAddon.name} for{' '}
                <span className="font-medium text-foreground">{managedAddonPrice}</span>. Your billing will be adjusted
                automatically.
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action onClick={handleAddManagedAddon}>Confirm</AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>

        <AlertDialog.Root open={removeManagedDialogOpen} onOpenChange={setRemoveManagedDialogOpen}>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Remove {managedAddon.name}</AlertDialog.Title>
              <AlertDialog.Description>
                This will remove {managedAddon.name} from your subscription. Your billing will be adjusted
                automatically.
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action onClick={handleRemoveManagedAddon}>Confirm</AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Dialog.Content>
    </Dialog.Root>
  )
}
