import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { withActor } from '@/context/auth.withActor'
import { cn } from '@/lib/utils'
import { Billing, type Billing as BillingType } from '@shopfunnel/core/billing/index'
import { Identifier } from '@shopfunnel/core/identifier'
import {
  IconChevronLeft as ChevronLeftIcon,
  IconChevronRight as ChevronRightIcon,
  IconCircleCheckFilled as CircleCheckFilledIcon,
  IconStarFilled as StarFilledIcon,
} from '@tabler/icons-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { motion } from 'motion/react'
import * as React from 'react'
import { z } from 'zod'
import { getBillingQueryOptions, PLANS } from '../-common'

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
          successUrl: data.successUrl,
          cancelUrl: data.cancelUrl,
        }),
      data.workspaceId,
    )
  })

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function BillingPage({ animate, title, subtitle }: { animate?: boolean; title: string; subtitle: string }) {
  const params = useParams({ from: '/_app/workspace/$workspaceId' })

  const billingQuery = useSuspenseQuery(getBillingQueryOptions(params.workspaceId))
  const billing = billingQuery.data

  const [isYearly, setIsYearly] = React.useState(true)
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const currentPlanIndex = billing.plan ? PLANS.findIndex((p) => p.id === billing.plan) : -1
  const availablePlans: (typeof PLANS)[number][] = billing.plan
    ? PLANS.filter((_, index) => index >= currentPlanIndex)
    : [...PLANS]

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

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
  }, [availablePlans.length])

  const scrollBy = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: direction === 'left' ? -296 : 296,
      behavior: 'smooth',
    })
  }

  const handlePlanSelect = async (plan: BillingType.Plan) => {
    setSelectedPlanId(plan)
    setIsLoading(true)
    try {
      const url = await createCheckoutUrl({
        data: {
          workspaceId: params.workspaceId,
          plan,
          interval: isYearly ? 'year' : 'month',
          successUrl: `${window.location.origin}/workspace/${params.workspaceId}`,
          cancelUrl: `${window.location.origin}/workspace/${params.workspaceId}/upgrade`,
        },
      })
      window.location.href = url
    } catch (error) {
      console.error('Failed to create checkout URL:', error)
      setSelectedPlanId(null)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 py-8">
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
              {availablePlans.map((plan, index) => {
                const isCurrentPlan = plan.id === billing.plan
                const showPopularBadge = plan.popular && !billing.plan

                const cardContent = (
                  <div
                    key={plan.id}
                    className={cn(
                      'h-full w-[264px] shrink-0 rounded-[24px] p-1 sm:w-[280px]',
                      showPopularBadge && 'bg-muted',
                    )}
                  >
                    {showPopularBadge ? (
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
                        showPopularBadge ? 'border-border/50 shadow-sm' : 'border-border',
                      )}
                    >
                      <div className="p-4 pt-5 sm:p-5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-lg font-semibold text-foreground">{plan.name}</p>
                          {isCurrentPlan ? (
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
                        ) : (
                          <Button
                            className="w-full"
                            disabled={isCurrentPlan || isLoading}
                            size="lg"
                            variant="outline"
                            onClick={() => handlePlanSelect(plan.id)}
                          >
                            {isLoading && selectedPlanId === plan.id ? (
                              <Spinner />
                            ) : isCurrentPlan ? (
                              'Current plan'
                            ) : billing.canTrial ? (
                              'Start 7-day trial'
                            ) : (
                              'Select plan'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )

                if (animate) {
                  return (
                    <motion.div
                      key={plan.id}
                      className="h-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.1 }}
                    >
                      {cardContent}
                    </motion.div>
                  )
                }

                return cardContent
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

      <div className="w-full max-w-[870px]">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-muted/50 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
          <div>
            <h3 className="font-semibold text-foreground">Managed Service Add-On</h3>
            <p className="mt-0.5 text-sm font-medium text-balance text-muted-foreground">
              We create up to 4 new funnels per month including continuous A/B testing and optimization.
            </p>
          </div>
          <Button
            nativeButton={false}
            size="lg"
            render={<a href="https://calendly.com/kai-shopfunnel/30min" target="_blank" />}
          >
            Book demo
          </Button>
        </div>
      </div>
    </div>
  )
}
