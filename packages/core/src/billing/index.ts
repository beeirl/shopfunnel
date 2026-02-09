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
            canTrial: !row.exempted && !row.trialEndsAt && !row.lastSubscribedAt,
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
      lastSubscribedAt: z.date(),
      trialStartedAt: z.date().optional(),
      trialEndsAt: z.date().optional(),
    }),
    async (input) => {
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
            lastSubscribedAt: input.lastSubscribedAt,
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
          })
          .where(eq(BillingTable.workspaceId, workspaceId)),
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

  export const planToStripeOveragePriceId = fn(z.enum(BillingPlan), (plan) => {
    if (plan === 'standard5K') return Resource.BILLING.standard5KOveragePriceId
    if (plan === 'standard25K') return Resource.BILLING.standard25KOveragePriceId
    if (plan === 'standard50K') return Resource.BILLING.standard50KOveragePriceId
    if (plan === 'standard100K') return Resource.BILLING.standard100KOveragePriceId
    if (plan === 'standard250K') return Resource.BILLING.standard250KOveragePriceId
  })
}
