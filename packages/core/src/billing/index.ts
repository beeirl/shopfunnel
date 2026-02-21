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

      const existingSubscription = await Billing.stripe().subscriptions.retrieve(billing.stripeSubscriptionId)
      if (existingSubscription.schedule) {
        const scheduleId =
          typeof existingSubscription.schedule === 'string'
            ? existingSubscription.schedule
            : existingSubscription.schedule.id
        await Billing.stripe().subscriptionSchedules.release(scheduleId)
      }

      const existingPlanItem = existingSubscription.items.data.find((item) =>
        Billing.stripePriceIdToPlan(item.price.id),
      )
      const existingVisitorsItem = existingSubscription.items.data.find((item) =>
        Billing.stripeVisitorsPriceIdToPlan(item.price.id),
      )
      if (!existingPlanItem) throw new Error('Existing plan subscription item not found')
      if (!existingVisitorsItem) throw new Error('Existing visitors subscription item not found')

      const planPriceId = Billing.planToStripePriceId({ plan: input.plan, interval: input.interval })
      const visitorsPriceId = Billing.planToStripeVisitorsPriceId(input.plan)
      if (!planPriceId) throw new Error('Invalid plan')
      if (!visitorsPriceId) throw new Error('Invalid visitors plan')

      const subscription = await Billing.stripe().subscriptions.update(billing.stripeSubscriptionId, {
        items: [
          { id: existingPlanItem.id, price: planPriceId },
          { id: existingVisitorsItem.id, price: visitorsPriceId },
        ],
        proration_behavior: 'always_invoice',
        payment_behavior: 'pending_if_incomplete',
      })
      const planItem = subscription.items.data.find((item) => Billing.stripePriceIdToPlan(item.price.id))
      if (!planItem) throw new Error('New plan subscription item not found')

      await Database.use((db) =>
        db
          .update(BillingTable)
          .set({
            plan: input.plan,
            interval: input.interval,
            pendingPlan: null,
            periodStartedAt: new Date(planItem.current_period_start * 1000),
            periodEndsAt: new Date(planItem.current_period_end * 1000),
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

      const schedule = await Billing.stripe().subscriptionSchedules.create({
        from_subscription: billing.stripeSubscriptionId,
      })

      const planPriceId = Billing.planToStripePriceId({ plan: input.plan, interval: input.interval })
      if (!planPriceId) throw new Error('Invalid plan')

      const visitorsPriceId = Billing.planToStripeVisitorsPriceId(input.plan)
      if (!visitorsPriceId) throw new Error('Invalid visitors plan')

      const addonItems = (schedule.phases[0]?.items ?? []).flatMap((item) => {
        const itemPriceId = typeof item.price === 'string' ? item.price : item.price.id
        const addon = Billing.stripePriceIdToAddon(itemPriceId)
        const addonPriceId = addon && Billing.addonToStripePriceId({ addon, interval: input.interval })
        return addonPriceId ? [{ price: addonPriceId, quantity: 1 }] : []
      })

      // Update the schedule with two phases:
      // Phase 1 (current): keep current items until current_period_end
      // Phase 2 (next): switch to the downgraded plan
      await Billing.stripe().subscriptionSchedules.update(schedule.id, {
        end_behavior: 'release',
        phases: [
          {
            items: schedule.phases[0]?.items.map((item) => ({
              price: typeof item.price === 'string' ? item.price : item.price.id,
              quantity: item.quantity ?? undefined,
            })),
            start_date: schedule.phases[0].start_date,
            end_date: schedule.phases[0].end_date,
          },
          {
            items: [{ price: planPriceId, quantity: 1 }, { price: visitorsPriceId }, ...addonItems],
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

    const subscription = await Billing.stripe().subscriptions.retrieve(billing.stripeSubscriptionId)
    const schedule = subscription.schedule
    if (!schedule) throw new Error('No subscription schedule found')

    await Billing.stripe().subscriptionSchedules.release(typeof schedule === 'string' ? schedule : schedule.id)

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

      const subscription = await Billing.stripe().subscriptions.retrieve(billing.stripeSubscriptionId)
      const subscriptionItems = subscription.items.data

      const addonItem = subscriptionItems.find((item) => Billing.stripePriceIdToAddon(item.price.id) === input.addon)
      if (addonItem) throw new Error('Addon already added')

      const addonPriceId = Billing.addonToStripePriceId({ addon: input.addon, interval: billing.interval })
      if (!addonPriceId) throw new Error('Invalid addon or interval')

      await Billing.stripe().subscriptions.update(billing.stripeSubscriptionId, {
        items: [{ price: addonPriceId }],
        proration_behavior: 'always_invoice',
        payment_behavior: 'pending_if_incomplete',
      })

      if (subscription.schedule) {
        const scheduleId = typeof subscription.schedule === 'string' ? subscription.schedule : subscription.schedule.id
        const schedule = await Billing.stripe().subscriptionSchedules.retrieve(scheduleId)

        await Billing.stripe().subscriptionSchedules.update(scheduleId, {
          phases: schedule.phases.map((phase) => {
            // Skip phases that already have the addon (e.g. phase 1 after the subscription update above)
            const hasAddons = phase.items.some((i) => {
              const priceId = typeof i.price === 'string' ? i.price : i.price.id
              return Billing.stripePriceIdToAddon(priceId) === input.addon
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
              const addonPriceId = (() => {
                const planItem = phase.items.find((i) => {
                  const priceId = typeof i.price === 'string' ? i.price : i.price.id
                  return !!Billing.stripePriceIdToPlan(priceId)
                })
                const planPrice =
                  planItem && typeof planItem.price !== 'string' && 'recurring' in planItem.price && planItem.price
                const interval =
                  Billing.Interval.safeParse(planPrice && planPrice.recurring?.interval).data ?? billing.interval!
                return Billing.addonToStripePriceId({ addon: input.addon, interval })
              })()

              return {
                items: [
                  ...phase.items.map((item) => ({
                    price: typeof item.price === 'string' ? item.price : item.price.id,
                    quantity: item.quantity ?? undefined,
                  })),
                  ...(addonPriceId ? [{ price: addonPriceId, quantity: 1 }] : []),
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

      const subscription = await Billing.stripe().subscriptions.retrieve(billing.stripeSubscriptionId)
      const subscriptionItems = subscription.items.data

      const addonItem = subscriptionItems.find((item) => Billing.stripePriceIdToAddon(item.price.id) === input.addon)
      if (!addonItem) throw new Error('Addon not found on subscription')

      await Billing.stripe().subscriptions.update(billing.stripeSubscriptionId, {
        items: [{ id: addonItem.id, deleted: true }],
        proration_behavior: 'always_invoice',
        payment_behavior: 'pending_if_incomplete',
      })

      // If a subscription schedule exists (pending downgrade), also update future phases
      // so the addon doesn't get re-added when the downgrade takes effect
      if (subscription.schedule) {
        const scheduleId = typeof subscription.schedule === 'string' ? subscription.schedule : subscription.schedule.id
        const schedule = await Billing.stripe().subscriptionSchedules.retrieve(scheduleId)

        await Billing.stripe().subscriptionSchedules.update(scheduleId, {
          phases: schedule.phases.map((phase) => ({
            items: phase.items
              .filter((item) => {
                const priceId = typeof item.price === 'string' ? item.price : item.price.id
                return Billing.stripePriceIdToAddon(priceId) !== input.addon
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
      } else if (input.interval === 'year') {
        if (input.plan === 'standard5K') return Resource.BILLING.standard5KYearlyPriceId
        if (input.plan === 'standard25K') return Resource.BILLING.standard25KYearlyPriceId
        if (input.plan === 'standard50K') return Resource.BILLING.standard50KYearlyPriceId
        if (input.plan === 'standard100K') return Resource.BILLING.standard100KYearlyPriceId
        if (input.plan === 'standard250K') return Resource.BILLING.standard250KYearlyPriceId
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
    if (stripePriceId === Resource.BILLING.standard5KYearlyPriceId) return 'standard5K'
    if (stripePriceId === Resource.BILLING.standard25KYearlyPriceId) return 'standard25K'
    if (stripePriceId === Resource.BILLING.standard50KYearlyPriceId) return 'standard50K'
    if (stripePriceId === Resource.BILLING.standard100KYearlyPriceId) return 'standard100K'
    if (stripePriceId === Resource.BILLING.standard250KYearlyPriceId) return 'standard250K'
  })

  export const stripePriceIdToAddon = fn(z.string(), (stripePriceId): Addon | undefined => {
    if (stripePriceId === Resource.BILLING.managedServiceMonthlyPriceId) return 'managed'
    if (stripePriceId === Resource.BILLING.managedServiceYearlyPriceId) return 'managed'
  })

  export const stripeVisitorsPriceIdToPlan = fn(z.string(), (stripePriceId): Plan | undefined => {
    if (stripePriceId === Resource.BILLING.standard5KVisitorsPriceId) return 'standard5K'
    if (stripePriceId === Resource.BILLING.standard25KVisitorsPriceId) return 'standard25K'
    if (stripePriceId === Resource.BILLING.standard50KVisitorsPriceId) return 'standard50K'
    if (stripePriceId === Resource.BILLING.standard100KVisitorsPriceId) return 'standard100K'
    if (stripePriceId === Resource.BILLING.standard250KVisitorsPriceId) return 'standard250K'
  })

  export const planToStripeVisitorsPriceId = fn(Billing.Plan, (plan) => {
    if (plan === 'standard5K') return Resource.BILLING.standard5KVisitorsPriceId
    if (plan === 'standard25K') return Resource.BILLING.standard25KVisitorsPriceId
    if (plan === 'standard50K') return Resource.BILLING.standard50KVisitorsPriceId
    if (plan === 'standard100K') return Resource.BILLING.standard100KVisitorsPriceId
    if (plan === 'standard250K') return Resource.BILLING.standard250KVisitorsPriceId
  })
}
