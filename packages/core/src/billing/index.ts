import { Resource } from '@shopfunnel/resource'
import { eq } from 'drizzle-orm'
import { Stripe } from 'stripe'
import { z } from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { User } from '../user/index'
import { fn } from '../utils/fn'
import { BillingInterval, BillingPlan, BillingTable } from './index.sql'

export namespace Billing {
  export const TRIAL_DAYS = 7

  export const Plan = z.enum(BillingPlan)
  export type Plan = z.infer<typeof Plan>

  export const Addon = z.enum(['managed'])
  export type Addon = z.infer<typeof Addon>

  export const Interval = z.enum(BillingInterval)
  export type Interval = z.infer<typeof Interval>

  export const stripe = () =>
    new Stripe(Resource.STRIPE_SECRET_KEY.value, {
      apiVersion: '2025-12-15.clover',
      httpClient: Stripe.createFetchHttpClient(),
    })

  export const get = async () => {
    return Database.use(async (tx) =>
      tx
        .select()
        .from(BillingTable)
        .where(eq(BillingTable.workspaceId, Actor.workspace()))
        .then((rows) => {
          const row = rows[0]
          if (!row) return undefined
          const now = new Date()
          return {
            ...row,
            canTrial: !row.exempted && !row.trialEndsAt && !row.periodStartedAt,
            onTrial: !!(row.trialEndsAt && row.trialEndsAt > now),
            active: !!(row.exempted || row.stripeSubscriptionId || (row.trialEndsAt && row.trialEndsAt > now)),
          }
        }),
    )
  }

  export const getUsage = fn(
    z.object({
      start: z.date(),
      end: z.date(),
    }),
    async (input) => {
      const url = new URL('https://api.us-east.aws.tinybird.co/v0/pipes/usages.json')
      url.search = new URLSearchParams({
        workspace_id: Actor.workspace(),
        start_date: input.start.toISOString(),
        end_date: input.end.toISOString(),
      }).toString()
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${Resource.TINYBIRD_TOKEN.value}` },
      })
      const json = (await response.json()) as any
      return { visitors: (json.data[0]?.visitors ?? 0) as number }
    },
  )

  export const assert = fn(z.void(), async () => {
    const billing = await Billing.get()
    if (!billing?.active) throw new Error('Billing is not valid')
  })

  export const generateCheckoutUrl = fn(
    z.object({
      plan: Billing.Plan,
      interval: Billing.Interval,
      managed: z.boolean().optional(),
      successUrl: z.string(),
      cancelUrl: z.string(),
    }),
    async (input) => {
      const user = Actor.assert('user')

      const email = await User.getAuthEmail(user.properties.userId)
      const billing = await Billing.get()

      const session = await Billing.stripe().checkout.sessions.create({
        mode: 'subscription',
        billing_address_collection: 'required',
        line_items: [
          {
            price: Billing.planToStripePriceId({ plan: input.plan, interval: input.interval }),
            quantity: 1,
          },
          ...(input.managed
            ? [
                {
                  price: Billing.addonToStripePriceId({ addon: 'managed', interval: input.interval }),
                  quantity: 1,
                },
              ]
            : []),
        ],
        ...(billing?.stripeCustomerId
          ? {
              customer: billing.stripeCustomerId,
              customer_update: {
                address: 'auto',
                name: 'auto',
              },
            }
          : {
              customer_email: email!,
            }),
        adaptive_pricing: {
          enabled: false,
        },
        automatic_tax: {
          enabled: true,
        },
        payment_method_types: ['card'],
        tax_id_collection: {
          enabled: true,
        },
        subscription_data: {
          ...(billing?.canTrial && { trial_period_days: TRIAL_DAYS }),
          metadata: {
            workspaceId: Actor.workspace(),
          },
        },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      })

      if (!session.url) {
        throw new Error('Failed to generate checkout URL')
      }

      return session.url
    },
  )

  export const generatePortalUrl = fn(
    z.object({
      returnUrl: z.string(),
    }),
    async (input) => {
      const billing = await Billing.get()
      if (!billing?.stripeCustomerId) {
        throw new Error('No Stripe customer Id found')
      }

      const session = await Billing.stripe().billingPortal.sessions.create({
        customer: billing.stripeCustomerId,
        return_url: input.returnUrl,
      })

      if (!session.url) {
        throw new Error('Failed to generate portal URL')
      }

      return session.url
    },
  )

  export const subscribe = fn(
    z.object({
      stripeCustomerId: z.string(),
      stripeSubscriptionId: z.string(),
      plan: Billing.Plan,
      managed: z.boolean(),
      interval: Billing.Interval,
      periodStartedAt: z.date(),
      periodEndsAt: z.date(),
      usagePeriodStartedAt: z.date().optional(),
      usagePeriodEndsAt: z.date().optional(),
      trialStartedAt: z.date().optional(),
      trialEndsAt: z.date().optional(),
    }),
    async (input) => {
      const billing = await Billing.get()

      await Database.use((db) =>
        db
          .update(BillingTable)
          .set({
            stripeCustomerId: input.stripeCustomerId,
            stripeSubscriptionId: input.stripeSubscriptionId,
            plan: input.plan,
            managed: input.managed,
            exempted: false,
            interval: input.interval,
            periodStartedAt: input.periodStartedAt,
            periodEndsAt: input.periodEndsAt,
            ...(input.usagePeriodStartedAt &&
              input.usagePeriodEndsAt && {
                usagePeriodStartedAt: input.usagePeriodStartedAt,
                usagePeriodEndsAt: input.usagePeriodEndsAt,
              }),
            ...(billing?.plan !== input.plan && billing?.pendingPlan === input.plan && { pendingPlan: null }),
            ...(input.trialStartedAt &&
              input.trialEndsAt && {
                trialStartedAt: input.trialStartedAt,
                trialEndsAt: input.trialEndsAt,
              }),
          })
          .where(eq(BillingTable.workspaceId, Actor.workspaceId())),
      )
    },
  )

  export const unsubscribe = fn(
    z.object({
      stripeSubscriptionId: z.string(),
    }),
    async ({ stripeSubscriptionId }) => {
      const workspaceId = await Database.use((tx) =>
        tx
          .select({ workspaceId: BillingTable.workspaceId })
          .from(BillingTable)
          .where(eq(BillingTable.stripeSubscriptionId, stripeSubscriptionId))
          .then((rows) => rows[0]?.workspaceId),
      )
      if (!workspaceId) throw new Error('Workspace Id not found for subscription')

      await Database.use(async (tx) =>
        tx
          .update(BillingTable)
          .set({
            stripeSubscriptionId: null,
            plan: null,
            interval: null,
            managed: false,
            pendingPlan: null,
            periodStartedAt: null,
            periodEndsAt: null,
            usagePeriodStartedAt: null,
            usagePeriodEndsAt: null,
          })
          .where(eq(BillingTable.workspaceId, workspaceId)),
      )
    },
  )

  export const upgrade = fn(
    z.object({
      plan: Billing.Plan,
      interval: Billing.Interval,
    }),
    async (input) => {
      const billing = await Billing.get()
      if (!billing?.stripeSubscriptionId) throw new Error('No active subscription found')
      if (billing.pendingPlan)
        throw new Error('Cannot upgrade while a downgrade is pending. Cancel the downgrade first.')

      const stripeExistingSubscription = await Billing.stripe().subscriptions.retrieve(billing.stripeSubscriptionId)
      if (stripeExistingSubscription.schedule) {
        const stripeScheduleId =
          typeof stripeExistingSubscription.schedule === 'string'
            ? stripeExistingSubscription.schedule
            : stripeExistingSubscription.schedule.id
        await Billing.stripe().subscriptionSchedules.release(stripeScheduleId)
      }

      const stripeExistingPlanItem = stripeExistingSubscription.items.data.find((item) =>
        Billing.stripePriceIdToPlan(item.price.id),
      )
      const stripeExistingUsageItem = stripeExistingSubscription.items.data.find((item) =>
        Billing.stripeUsagePriceIdToPlan(item.price.id),
      )
      if (!stripeExistingPlanItem) throw new Error('Existing plan subscription item not found')
      if (!stripeExistingUsageItem) throw new Error('Existing usage subscription item not found')

      const stripePlanPriceId = Billing.planToStripePriceId({ plan: input.plan, interval: input.interval })
      const stripeUsagePriceId = Billing.planToStripeUsagePriceId(input.plan)
      if (!stripePlanPriceId) throw new Error('Invalid plan')
      if (!stripeUsagePriceId) throw new Error('Invalid usage plan')

      const stripeSubscription = await Billing.stripe().subscriptions.update(billing.stripeSubscriptionId, {
        items: [
          { id: stripeExistingPlanItem.id, price: stripePlanPriceId },
          { id: stripeExistingUsageItem.id, price: stripeUsagePriceId },
        ],
        proration_behavior: 'always_invoice',
        payment_behavior: 'pending_if_incomplete',
      })
      const stripePlanItem = stripeSubscription.items.data.find((item) => Billing.stripePriceIdToPlan(item.price.id))
      const stripeUsageItem = stripeSubscription.items.data.find((item) =>
        Billing.stripeUsagePriceIdToPlan(item.price.id),
      )
      if (!stripePlanItem) throw new Error('New plan subscription item not found')

      await Database.use((db) =>
        db
          .update(BillingTable)
          .set({
            plan: input.plan,
            interval: input.interval,
            pendingPlan: null,
            periodStartedAt: new Date(stripePlanItem.current_period_start * 1000),
            periodEndsAt: new Date(stripePlanItem.current_period_end * 1000),
            ...(stripeUsageItem && {
              usagePeriodStartedAt: new Date(stripeUsageItem.current_period_start * 1000),
              usagePeriodEndsAt: new Date(stripeUsageItem.current_period_end * 1000),
            }),
          })
          .where(eq(BillingTable.workspaceId, Actor.workspaceId())),
      )
    },
  )

  export const downgrade = fn(
    z.object({
      plan: Billing.Plan,
      interval: Billing.Interval,
    }),
    async (input) => {
      const billing = await Billing.get()
      if (!billing?.stripeSubscriptionId) throw new Error('No active subscription found')
      if (billing.pendingPlan) throw new Error('Cannot downgrade while a plan change is already pending.')

      const stripeSchedule = await Billing.stripe().subscriptionSchedules.create({
        from_subscription: billing.stripeSubscriptionId,
      })

      const stripePlanPriceId = Billing.planToStripePriceId({ plan: input.plan, interval: input.interval })
      if (!stripePlanPriceId) throw new Error('Invalid plan')

      const stripeUsagePriceId = Billing.planToStripeUsagePriceId(input.plan)
      if (!stripeUsagePriceId) throw new Error('Invalid usage plan')

      const stripeAddonItems = (stripeSchedule.phases[0]?.items ?? []).flatMap((item) => {
        const stripeItemPriceId = typeof item.price === 'string' ? item.price : item.price.id
        const addon = Billing.stripePriceIdToAddon(stripeItemPriceId)
        const stripeAddonPriceId = addon && Billing.addonToStripePriceId({ addon, interval: input.interval })
        return stripeAddonPriceId ? [{ price: stripeAddonPriceId, quantity: 1 }] : []
      })

      // Update the schedule with two phases:
      // Phase 1 (current): keep current items until current_period_end
      // Phase 2 (next): switch to the downgraded plan
      await Billing.stripe().subscriptionSchedules.update(stripeSchedule.id, {
        end_behavior: 'release',
        phases: [
          {
            items: stripeSchedule.phases[0]?.items.map((item) => ({
              price: typeof item.price === 'string' ? item.price : item.price.id,
              quantity: item.quantity ?? undefined,
            })),
            start_date: stripeSchedule.phases[0].start_date,
            end_date: stripeSchedule.phases[0].end_date,
          },
          {
            items: [{ price: stripePlanPriceId, quantity: 1 }, { price: stripeUsagePriceId }, ...stripeAddonItems],
            proration_behavior: 'none',
            metadata: { workspaceId: Actor.workspaceId() },
          },
        ],
      })

      await Database.use((db) =>
        db
          .update(BillingTable)
          .set({ pendingPlan: input.plan })
          .where(eq(BillingTable.workspaceId, Actor.workspaceId())),
      )
    },
  )

  export const cancelDowngrade = fn(z.void(), async () => {
    const billing = await Billing.get()
    if (!billing?.stripeSubscriptionId) throw new Error('No active subscription found')
    if (!billing.pendingPlan) throw new Error('No downgrade scheduled')

    const stripeSubscription = await Billing.stripe().subscriptions.retrieve(billing.stripeSubscriptionId)
    const stripeSchedule = stripeSubscription.schedule
    if (!stripeSchedule) throw new Error('No subscription schedule found')

    await Billing.stripe().subscriptionSchedules.release(
      typeof stripeSchedule === 'string' ? stripeSchedule : stripeSchedule.id,
    )

    await Database.use((db) =>
      db.update(BillingTable).set({ pendingPlan: null }).where(eq(BillingTable.workspaceId, Actor.workspaceId())),
    )
  })

  export const addAddon = fn(
    z.object({
      addon: Billing.Addon,
    }),
    async (input) => {
      const billing = await Billing.get()
      if (!billing?.stripeSubscriptionId) throw new Error('No active subscription found')
      if (!billing.interval) throw new Error('No billing interval found')

      const stripeSubscription = await Billing.stripe().subscriptions.retrieve(billing.stripeSubscriptionId)
      const stripeSubscriptionItems = stripeSubscription.items.data

      const stripeAddonItem = stripeSubscriptionItems.find(
        (item) => Billing.stripePriceIdToAddon(item.price.id) === input.addon,
      )
      if (stripeAddonItem) throw new Error('Addon already added')

      const stripeAddonPriceId = Billing.addonToStripePriceId({ addon: input.addon, interval: billing.interval })
      if (!stripeAddonPriceId) throw new Error('Invalid addon or interval')

      await Billing.stripe().subscriptions.update(billing.stripeSubscriptionId, {
        items: [{ price: stripeAddonPriceId }],
        proration_behavior: 'always_invoice',
        payment_behavior: 'pending_if_incomplete',
      })

      if (stripeSubscription.schedule) {
        const stripeScheduleId =
          typeof stripeSubscription.schedule === 'string' ? stripeSubscription.schedule : stripeSubscription.schedule.id
        const stripeSchedule = await Billing.stripe().subscriptionSchedules.retrieve(stripeScheduleId)

        await Billing.stripe().subscriptionSchedules.update(stripeScheduleId, {
          phases: stripeSchedule.phases.map((phase) => {
            // Skip phases that already have the addon (e.g. phase 1 after the subscription update above)
            const hasAddons = phase.items.some((i) => {
              const stripePriceId = typeof i.price === 'string' ? i.price : i.price.id
              return Billing.stripePriceIdToAddon(stripePriceId) === input.addon
            })
            if (hasAddons) {
              return {
                items: phase.items.map((item) => ({
                  price: typeof item.price === 'string' ? item.price : item.price.id,
                  quantity: item.quantity ?? undefined,
                })),
                start_date: phase.start_date,
                end_date: phase.end_date,
                proration_behavior: 'none' as const,
                metadata: phase.metadata as Record<string, string>,
              }
            } else {
              const stripeAddonPriceId = (() => {
                const stripePlanItem = phase.items.find((i) => {
                  const stripePriceId = typeof i.price === 'string' ? i.price : i.price.id
                  return !!Billing.stripePriceIdToPlan(stripePriceId)
                })
                const stripePlanPrice =
                  stripePlanItem &&
                  typeof stripePlanItem.price !== 'string' &&
                  'recurring' in stripePlanItem.price &&
                  stripePlanItem.price
                const interval =
                  Billing.Interval.safeParse(stripePlanPrice && stripePlanPrice.recurring?.interval).data ??
                  billing.interval!
                return Billing.addonToStripePriceId({ addon: input.addon, interval })
              })()

              return {
                items: [
                  ...phase.items.map((item) => ({
                    price: typeof item.price === 'string' ? item.price : item.price.id,
                    quantity: item.quantity ?? undefined,
                  })),
                  ...(stripeAddonPriceId ? [{ price: stripeAddonPriceId, quantity: 1 }] : []),
                ],
                start_date: phase.start_date,
                end_date: phase.end_date,
                proration_behavior: 'none' as const,
                metadata: phase.metadata as Record<string, string>,
              }
            }
          }),
        })
      }

      await Database.use((db) =>
        db
          .update(BillingTable)
          .set({ managed: input.addon === 'managed' && true })
          .where(eq(BillingTable.workspaceId, Actor.workspaceId())),
      )
    },
  )

  export const removeAddon = fn(
    z.object({
      addon: Billing.Addon,
    }),
    async (input) => {
      const billing = await Billing.get()
      if (!billing?.stripeSubscriptionId) throw new Error('No active subscription found')

      const stripeSubscription = await Billing.stripe().subscriptions.retrieve(billing.stripeSubscriptionId)
      const stripeSubscriptionItems = stripeSubscription.items.data

      const stripeAddonItem = stripeSubscriptionItems.find(
        (item) => Billing.stripePriceIdToAddon(item.price.id) === input.addon,
      )
      if (!stripeAddonItem) throw new Error('Addon not found on subscription')

      await Billing.stripe().subscriptions.update(billing.stripeSubscriptionId, {
        items: [{ id: stripeAddonItem.id, deleted: true }],
        proration_behavior: 'always_invoice',
        payment_behavior: 'pending_if_incomplete',
      })

      // If a subscription schedule exists (pending downgrade), also update future phases
      // so the addon doesn't get re-added when the downgrade takes effect
      if (stripeSubscription.schedule) {
        const stripeScheduleId =
          typeof stripeSubscription.schedule === 'string' ? stripeSubscription.schedule : stripeSubscription.schedule.id
        const stripeSchedule = await Billing.stripe().subscriptionSchedules.retrieve(stripeScheduleId)

        await Billing.stripe().subscriptionSchedules.update(stripeScheduleId, {
          phases: stripeSchedule.phases.map((phase) => ({
            items: phase.items
              .filter((item) => {
                const stripePriceId = typeof item.price === 'string' ? item.price : item.price.id
                return Billing.stripePriceIdToAddon(stripePriceId) !== input.addon
              })
              .map((item) => ({
                price: typeof item.price === 'string' ? item.price : item.price.id,
                quantity: item.quantity ?? undefined,
              })),
            start_date: phase.start_date,
            end_date: phase.end_date,
            proration_behavior: 'none' as const,
            metadata: phase.metadata as Record<string, string>,
          })),
        })
      }

      await Database.use((db) =>
        db
          .update(BillingTable)
          .set({ managed: input.addon === 'managed' && false })
          .where(eq(BillingTable.workspaceId, Actor.workspaceId())),
      )
    },
  )

  export const reportUsageToStripe = fn(
    z.object({
      stripeCustomerId: z.string(),
      start: z.date(),
      end: z.date(),
    }),
    async (input) => {
      const usage = await Billing.getUsage({ start: input.start, end: input.end })
      if (usage.visitors === 0) return

      const timestamp = Math.floor(input.end.getTime() / 1000) - 1

      await Billing.stripe().billing.meterEvents.create({
        event_name: Resource.VISITOR_METER_EVENT_NAME.value,
        identifier: `${Actor.workspaceId()}-${timestamp}`,
        timestamp,
        payload: {
          stripe_customer_id: input.stripeCustomerId,
          value: String(usage.visitors),
        },
      })
    },
  )

  export const planToStripePriceId = fn(
    z.object({
      plan: Billing.Plan,
      interval: Billing.Interval,
    }),
    (input) => {
      if (input.interval === 'month') {
        if (input.plan === 'standard5K') return Resource.BILLING.standard5KMonthlyPriceId
        if (input.plan === 'standard25K') return Resource.BILLING.standard25KMonthlyPriceId
        if (input.plan === 'standard50K') return Resource.BILLING.standard50KMonthlyPriceId
        if (input.plan === 'standard100K') return Resource.BILLING.standard100KMonthlyPriceId
        if (input.plan === 'standard250K') return Resource.BILLING.standard250KMonthlyPriceId
        if (input.plan === 'standard500K') return Resource.BILLING.standard500KMonthlyPriceId
        if (input.plan === 'standard1M') return Resource.BILLING.standard1MMonthlyPriceId
        if (input.plan === 'standard2M') return Resource.BILLING.standard2MMonthlyPriceId
      } else if (input.interval === 'year') {
        if (input.plan === 'standard5K') return Resource.BILLING.standard5KYearlyPriceId
        if (input.plan === 'standard25K') return Resource.BILLING.standard25KYearlyPriceId
        if (input.plan === 'standard50K') return Resource.BILLING.standard50KYearlyPriceId
        if (input.plan === 'standard100K') return Resource.BILLING.standard100KYearlyPriceId
        if (input.plan === 'standard250K') return Resource.BILLING.standard250KYearlyPriceId
        if (input.plan === 'standard500K') return Resource.BILLING.standard500KYearlyPriceId
        if (input.plan === 'standard1M') return Resource.BILLING.standard1MYearlyPriceId
        if (input.plan === 'standard2M') return Resource.BILLING.standard2MYearlyPriceId
      }
    },
  )

  export const addonToStripePriceId = fn(
    z.object({
      addon: Billing.Addon,
      interval: Billing.Interval,
    }),
    (input) => {
      if (input.interval === 'month') {
        if (input.addon === 'managed') return Resource.BILLING.managedServiceMonthlyPriceId
      } else if (input.interval === 'year') {
        if (input.addon === 'managed') return Resource.BILLING.managedServiceYearlyPriceId
      }
    },
  )

  export const stripePriceIdToPlan = fn(z.string(), (stripePriceId): Plan | undefined => {
    if (stripePriceId === Resource.BILLING.standard5KMonthlyPriceId) return 'standard5K'
    if (stripePriceId === Resource.BILLING.standard25KMonthlyPriceId) return 'standard25K'
    if (stripePriceId === Resource.BILLING.standard50KMonthlyPriceId) return 'standard50K'
    if (stripePriceId === Resource.BILLING.standard100KMonthlyPriceId) return 'standard100K'
    if (stripePriceId === Resource.BILLING.standard250KMonthlyPriceId) return 'standard250K'
    if (stripePriceId === Resource.BILLING.standard500KMonthlyPriceId) return 'standard500K'
    if (stripePriceId === Resource.BILLING.standard1MMonthlyPriceId) return 'standard1M'
    if (stripePriceId === Resource.BILLING.standard2MMonthlyPriceId) return 'standard2M'
    if (stripePriceId === Resource.BILLING.standard5KYearlyPriceId) return 'standard5K'
    if (stripePriceId === Resource.BILLING.standard25KYearlyPriceId) return 'standard25K'
    if (stripePriceId === Resource.BILLING.standard50KYearlyPriceId) return 'standard50K'
    if (stripePriceId === Resource.BILLING.standard100KYearlyPriceId) return 'standard100K'
    if (stripePriceId === Resource.BILLING.standard250KYearlyPriceId) return 'standard250K'
    if (stripePriceId === Resource.BILLING.standard500KYearlyPriceId) return 'standard500K'
    if (stripePriceId === Resource.BILLING.standard1MYearlyPriceId) return 'standard1M'
    if (stripePriceId === Resource.BILLING.standard2MYearlyPriceId) return 'standard2M'
  })

  export const stripePriceIdToAddon = fn(z.string(), (stripePriceId): Addon | undefined => {
    if (stripePriceId === Resource.BILLING.managedServiceMonthlyPriceId) return 'managed'
    if (stripePriceId === Resource.BILLING.managedServiceYearlyPriceId) return 'managed'
  })

  export const stripeUsagePriceIdToPlan = fn(z.string(), (stripePriceId): Plan | undefined => {
    if (stripePriceId === Resource.BILLING.standard5KVisitorsPriceId) return 'standard5K'
    if (stripePriceId === Resource.BILLING.standard25KVisitorsPriceId) return 'standard25K'
    if (stripePriceId === Resource.BILLING.standard50KVisitorsPriceId) return 'standard50K'
    if (stripePriceId === Resource.BILLING.standard100KVisitorsPriceId) return 'standard100K'
    if (stripePriceId === Resource.BILLING.standard250KVisitorsPriceId) return 'standard250K'
    if (stripePriceId === Resource.BILLING.standard500KVisitorsPriceId) return 'standard500K'
    if (stripePriceId === Resource.BILLING.standard1MVisitorsPriceId) return 'standard1M'
    if (stripePriceId === Resource.BILLING.standard2MVisitorsPriceId) return 'standard2M'
  })

  export const planToStripeUsagePriceId = fn(Billing.Plan, (plan) => {
    if (plan === 'standard5K') return Resource.BILLING.standard5KVisitorsPriceId
    if (plan === 'standard25K') return Resource.BILLING.standard25KVisitorsPriceId
    if (plan === 'standard50K') return Resource.BILLING.standard50KVisitorsPriceId
    if (plan === 'standard100K') return Resource.BILLING.standard100KVisitorsPriceId
    if (plan === 'standard250K') return Resource.BILLING.standard250KVisitorsPriceId
    if (plan === 'standard500K') return Resource.BILLING.standard500KVisitorsPriceId
    if (plan === 'standard1M') return Resource.BILLING.standard1MVisitorsPriceId
    if (plan === 'standard2M') return Resource.BILLING.standard2MVisitorsPriceId
  })
}
