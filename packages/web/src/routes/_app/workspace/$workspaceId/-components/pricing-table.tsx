import { AlertDialog } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { withActor } from '@/context/auth.withActor'
import { snackbar } from '@/lib/snackbar'
import { cn } from '@/lib/utils'
import { Billing, type Billing as BillingType } from '@shopfunnel/core/billing/index'
import { Identifier } from '@shopfunnel/core/identifier'
import {
  IconCheck as CheckIcon,
  IconChevronLeft as ChevronLeftIcon,
  IconChevronRight as ChevronRightIcon,
  IconCircleCheckFilled as CircleCheckFilledIcon,
  IconStarFilled as StarFilledIcon,
} from '@tabler/icons-react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { motion } from 'motion/react'
import * as React from 'react'
import { z } from 'zod'
import { ADDONS, formatPrice, getBillingQueryOptions, PLANS } from '../-common'

const createCheckoutUrl = createServerFn()
  .inputValidator(
    z.object({
      ...Billing.generateCheckoutUrl.schema.shape,
      workspaceId: Identifier.schema('workspace'),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Billing.generateCheckoutUrl({
          plan: data.plan,
          interval: data.interval,
          managed: data.managed,
          successUrl: data.successUrl,
          cancelUrl: data.cancelUrl,
        }),
      data.workspaceId,
    )
  })

const upgrade = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      plan: Billing.Plan,
      interval: Billing.Interval,
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Billing.upgrade({ plan: data.plan, interval: data.interval }), data.workspaceId)
  })

const downgrade = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      plan: Billing.Plan,
      interval: Billing.Interval,
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Billing.downgrade({ plan: data.plan, interval: data.interval }), data.workspaceId)
  })

export function PricingTable({ animate, mode }: { animate?: boolean; mode: 'create' | 'upgrade' | 'downgrade' }) {
  const params = useParams({ from: '/_app/workspace/$workspaceId' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const billingQuery = useSuspenseQuery(getBillingQueryOptions(params.workspaceId))
  const billing = billingQuery.data

  const [isYearly, setIsYearly] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [managed, setManaged] = React.useState(true)
  const [selectedPlan, setSelectedPlan] = React.useState<BillingType.Plan | null>(null)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = React.useState(false)
  const [downgradeDialogOpen, setDowngradeDialogOpen] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const currentPlanIndex = billing.plan ? PLANS.findIndex((p) => p.id === billing.plan) : -1
  const currentPlan = billing.plan ? PLANS.find((p) => p.id === billing.plan) : null
  const popularPlanId = (() => {
    if (mode === 'create') return PLANS.find((p) => 'defaultPopular' in p && p.defaultPopular)?.id ?? null
    if (mode === 'upgrade') return PLANS[currentPlanIndex + 1]?.id ?? null
    return null
  })()
  const targetPlan = selectedPlan ? PLANS.find((p) => p.id === selectedPlan) : null
  const title = (() => {
    if (mode === 'upgrade') return 'Upgrade your plan'
    if (mode === 'downgrade') return 'Downgrade your plan'
    return 'Choose your plan'
  })()
  const subtitle = (() => {
    if (mode === 'downgrade') return 'Select a lower plan'
    return 'Get more sessions as your shop grows'
  })()
  const intervalLabel = isYearly ? 'Yearly' : 'Monthly'

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateScrollState = () => {
      setCanScrollLeft(el.scrollLeft > 0)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }

    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })

    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', updateScrollState)
      observer.disconnect()
    }
  }, [])

  const scrollBy = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: direction === 'left' ? -296 : 296,
      behavior: 'smooth',
    })
  }

  const handleCreate = async (plan: BillingType.Plan) => {
    setSelectedPlan(plan)
    setIsLoading(true)
    try {
      const url = await createCheckoutUrl({
        data: {
          workspaceId: params.workspaceId,
          plan,
          interval: isYearly ? 'year' : 'month',
          managed,
          successUrl: `${window.location.origin}/workspace/${params.workspaceId}`,
          cancelUrl: window.location.href,
        },
      })
      window.location.href = url
    } catch (error) {
      console.error('Failed to create checkout URL:', error)
      setSelectedPlan(null)
      setIsLoading(false)
    }
  }

  const handleUpgrade = async () => {
    if (!selectedPlan) return

    setIsLoading(true)
    try {
      await upgrade({
        data: {
          workspaceId: params.workspaceId,
          plan: selectedPlan,
          interval: isYearly ? 'year' : 'month',
        },
      })
      await queryClient.invalidateQueries({ queryKey: ['billing', params.workspaceId] })
      snackbar.add({ title: 'Plan upgraded successfully', type: 'success' })
      setUpgradeDialogOpen(false)
      navigate({ to: '/workspace/$workspaceId', params: { workspaceId: params.workspaceId } })
    } catch (error) {
      console.error('Failed to upgrade subscription:', error)
      setSelectedPlan(null)
      setIsLoading(false)
    }
  }

  const handleDowngrade = async () => {
    if (!selectedPlan) return

    setIsLoading(true)
    try {
      await downgrade({
        data: {
          workspaceId: params.workspaceId,
          plan: selectedPlan,
          interval: isYearly ? 'year' : 'month',
        },
      })
      await queryClient.invalidateQueries({ queryKey: ['billing', params.workspaceId] })
      snackbar.add({ title: 'Downgrade scheduled', type: 'success' })
      setDowngradeDialogOpen(false)
      navigate({ to: '/workspace/$workspaceId', params: { workspaceId: params.workspaceId } })
    } catch (error) {
      console.error('Failed to schedule downgrade:', error)
      setSelectedPlan(null)
      setIsLoading(false)
    }
  }

  const handleSelect = (plan: BillingType.Plan) => {
    setSelectedPlan(plan)

    switch (mode) {
      case 'create':
        handleCreate(plan)
        break
      case 'upgrade':
        setUpgradeDialogOpen(true)
        break
      case 'downgrade':
        setDowngradeDialogOpen(true)
        break
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 py-12">
      <div className="flex w-full max-w-[870px] flex-col px-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-bold text-foreground md:text-2xl">{title}</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground sm:mt-2">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 max-sm:mt-2">
          <label className="text-sm font-medium" htmlFor="billing-interval">
            Monthly
          </label>
          <Switch id="billing-interval" checked={isYearly} onCheckedChange={setIsYearly} />
          <label className="text-sm font-medium" htmlFor="billing-interval">
            Yearly
          </label>
          <Badge className="bg-emerald-100 text-emerald-900">2 months free</Badge>
        </div>
      </div>

      <div className="relative w-full lg:mx-auto lg:max-w-[1126px] lg:overflow-x-clip">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-32 bg-linear-to-r from-background to-transparent lg:block" />

        <div ref={scrollRef} className="no-scrollbar w-full overflow-x-auto">
          <div className="flex">
            <div className="shrink-0" style={{ width: 'max(16px, calc(50% - 436px))' }} />

            <div className="flex shrink-0 items-stretch gap-4 py-2">
              {PLANS.map((plan, index) => {
                const isCurrent = plan.id === billing.plan
                const planIndex = PLANS.findIndex((p) => p.id === plan.id)
                const isSelectable =
                  mode === 'create'
                    ? true
                    : mode === 'upgrade'
                      ? planIndex > currentPlanIndex
                      : planIndex < currentPlanIndex
                const isPopular = plan.id === popularPlanId

                const content = (
                  <div
                    key={plan.id}
                    className={cn('h-full w-[264px] shrink-0 rounded-[24px] p-1 sm:w-[280px]', isPopular && 'bg-muted')}
                  >
                    {isPopular ? (
                      <div className="flex h-8 items-center justify-center">
                        <span className="relative flex items-center gap-1.5 overflow-hidden text-xs font-medium whitespace-nowrap text-foreground">
                          <StarFilledIcon className="size-3.5 -translate-y-px" />
                          Most Popular
                          <span
                            className="absolute inset-0 flex animate-shimmer items-center gap-1.5 text-white"
                            style={{
                              maskImage: 'linear-gradient(90deg, transparent 33%, black, transparent 66%)',
                              WebkitMaskImage: 'linear-gradient(90deg, transparent 33%, black, transparent 66%)',
                              maskSize: '300% 100%',
                              WebkitMaskSize: '300% 100%',
                            }}
                          >
                            <StarFilledIcon className="size-3.5 -translate-y-px" />
                            Most Popular
                          </span>
                        </span>
                      </div>
                    ) : (
                      <div className="h-8" />
                    )}

                    <div
                      className={cn(
                        'flex h-[calc(100%-2rem)] flex-col justify-between rounded-[20px] border bg-background',
                        isPopular ? 'border-border/50 shadow-sm' : 'border-border',
                      )}
                    >
                      <div className="p-4 pt-5 sm:p-5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-lg font-semibold text-foreground">{plan.name}</p>
                          {isCurrent ? (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          ) : isYearly && plan.monthlyPrice !== null ? (
                            <Badge className="bg-emerald-100 text-emerald-900 duration-500 fade-in">
                              2 months free
                            </Badge>
                          ) : null}
                        </div>

                        <div className="mt-3">
                          <div className="relative">
                            {plan.monthlyPrice && (
                              <div
                                className={cn(
                                  'flex items-baseline transition-opacity duration-300',
                                  isYearly ? 'pointer-events-none absolute inset-0 opacity-0' : 'opacity-100',
                                )}
                              >
                                <span className="text-3xl font-bold text-foreground">
                                  {formatPrice(plan.monthlyPrice)}
                                </span>
                                <span className="text-base font-medium text-foreground">/month</span>
                              </div>
                            )}

                            {plan.yearlyPrice && (
                              <div
                                className={cn(
                                  'flex items-baseline gap-2 transition-opacity duration-300',
                                  isYearly ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0',
                                )}
                              >
                                <span className="text-xl font-bold text-muted-foreground line-through">
                                  {formatPrice(plan.monthlyPrice)}
                                </span>
                                <div>
                                  <span className="text-3xl font-bold text-foreground">
                                    {formatPrice(Math.round(plan.yearlyPrice! / 12))}
                                  </span>
                                  <span className="text-base font-medium text-foreground">/month</span>
                                </div>
                              </div>
                            )}

                            {plan.monthlyPrice === null && plan.yearlyPrice === null && (
                              <div className="flex items-baseline">
                                <span className="text-3xl font-bold text-foreground">Custom</span>
                              </div>
                            )}
                          </div>

                          <div
                            className={cn(
                              'grid transition-all duration-300',
                              isYearly ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                            )}
                          >
                            <div className="overflow-hidden">
                              <p
                                className={cn(
                                  'pt-1 text-xs text-foreground',
                                  plan.monthlyPrice === null && plan.yearlyPrice === null && 'invisible',
                                )}
                              >
                                Billed yearly
                              </p>
                            </div>
                          </div>
                        </div>

                        <ul className="mt-6 flex flex-col gap-3">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                              <CircleCheckFilledIcon className="size-5 shrink-0 text-foreground" />
                              <span className="text-sm text-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 pt-3 sm:p-5 sm:pt-3">
                        {plan.id === 'enterprise' ? (
                          <Button
                            className="w-full"
                            size="lg"
                            nativeButton={false}
                            variant="outline"
                            render={<a href="https://calendly.com/kai-shopfunnel/30min" target="_blank" />}
                          >
                            Book demo
                          </Button>
                        ) : isCurrent ? (
                          <Button className="w-full" disabled size="lg" variant="outline">
                            <CheckIcon />
                            Current
                          </Button>
                        ) : isSelectable ? (
                          <Button
                            className="w-full"
                            disabled={isLoading}
                            size="lg"
                            variant="outline"
                            onClick={() => handleSelect(plan.id)}
                          >
                            {isLoading && selectedPlan === plan.id && <Spinner />}
                            {mode === 'create' && billing.canTrial
                              ? 'Start 7-day trial'
                              : mode === 'create'
                                ? 'Select plan'
                                : mode === 'upgrade'
                                  ? 'Upgrade'
                                  : 'Downgrade'}
                          </Button>
                        ) : mode === 'upgrade' ? (
                          <Button className="w-full" disabled size="lg" variant="outline">
                            <CheckIcon />
                            Subscribed
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )

                if (mode === 'downgrade' && plan.id === 'enterprise') {
                  return null
                }

                if (animate) {
                  return (
                    <motion.div
                      key={plan.id}
                      className="h-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.1 }}
                    >
                      {content}
                    </motion.div>
                  )
                }

                return content
              })}
            </div>

            <div className="shrink-0" style={{ width: 'max(16px, calc(50% - 436px))' }} />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-32 bg-linear-to-l from-background to-transparent lg:block" />

        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollBy('left')}
          className={cn(
            'absolute top-[calc(50%+1rem)] left-[max(0px,calc(50%-449px))] z-20 hidden h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border border-border bg-background transition-opacity duration-300 hover:bg-accent lg:flex',
            canScrollLeft ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <ChevronLeftIcon className="size-4.5" />
        </button>

        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollBy('right')}
          className={cn(
            'absolute top-[calc(50%+1rem)] right-[max(0px,calc(50%-449px))] z-20 ml-4 hidden h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border border-border bg-background transition-opacity duration-300 hover:bg-accent lg:flex',
            canScrollRight ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <ChevronRightIcon className="size-4.5" />
        </button>
      </div>

      {mode === 'create' &&
        ADDONS.map((addon) => (
          <div key={addon.id} className="w-full max-w-[870px]">
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-muted/50 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{addon.name} Add-On</span>
                  <Badge className="bg-foreground/10 text-foreground">{formatPrice(addon.monthlyPrice)}/month</Badge>
                </div>
                <p className="mt-0.5 text-sm font-medium text-balance text-muted-foreground">{addon.description}</p>
              </div>
              <Switch id={`${addon.id}-addon`} checked={managed} defaultChecked onCheckedChange={setManaged} />
            </div>
          </div>
        ))}

      <AlertDialog.Root
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        onOpenChangeComplete={(open) => {
          if (!open && !isLoading) setSelectedPlan(null)
        }}
      >
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Subscription upgrade</AlertDialog.Title>
            <AlertDialog.Description>
              Upgrade from <span className="font-medium text-foreground">{currentPlan?.name}</span> to{' '}
              <span className="font-medium text-foreground">{targetPlan?.name}</span>
              {targetPlan && (isYearly ? targetPlan.yearlyPrice : targetPlan.monthlyPrice) && (
                <>
                  {' '}
                  at{' '}
                  <span className="font-medium text-foreground">
                    {isYearly
                      ? `${formatPrice(Math.round(targetPlan.yearlyPrice! / 12))}/month`
                      : `${formatPrice(targetPlan.monthlyPrice!)}/month`}
                  </span>
                  {isYearly && <> (billed yearly at {formatPrice(targetPlan.yearlyPrice!)})</>}
                </>
              )}
              . Prorated charges will apply to your next invoice.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={isLoading}>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action disabled={isLoading} onClick={handleUpgrade}>
              Confirm
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>

      <AlertDialog.Root
        open={downgradeDialogOpen}
        onOpenChange={setDowngradeDialogOpen}
        onOpenChangeComplete={(open) => {
          if (!open && !isLoading) setSelectedPlan(null)
        }}
      >
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Schedule downgrade</AlertDialog.Title>
            <AlertDialog.Description>
              Downgrade from <span className="font-medium text-foreground">{currentPlan?.name}</span> to{' '}
              <span className="font-medium text-foreground">{targetPlan?.name}</span>
              {targetPlan && (isYearly ? targetPlan.yearlyPrice : targetPlan.monthlyPrice) && (
                <>
                  {' '}
                  at{' '}
                  <span className="font-medium text-foreground">
                    {isYearly
                      ? `${formatPrice(Math.round(targetPlan.yearlyPrice! / 12))}/month`
                      : `${formatPrice(targetPlan.monthlyPrice!)}/month`}
                  </span>
                  {isYearly && <> (billed yearly at {formatPrice(targetPlan.yearlyPrice!)})</>}
                </>
              )}
              . This takes effect at the end of your current billing period.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={isLoading}>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action disabled={isLoading} onClick={handleDowngrade}>
              Confirm
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  )
}
