import { Actor } from '@shopfunnel/core/actor'
import { Billing } from '@shopfunnel/core/billing/index'
import { BillingTable } from '@shopfunnel/core/billing/index.sql'
import { Database } from '@shopfunnel/core/database/index'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Resource } from '@shopfunnel/resource'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'

export const StripeRoute = new Hono().post('/webhook', async (c) => {
  const body = await Billing.stripe().webhooks.constructEventAsync(
    await c.req.text(),
    c.req.header('stripe-signature')!,
    Resource.STRIPE_WEBHOOK_SECRET.value,
  )
  console.log(body.type, JSON.stringify(body, null, 2))

  return (async () => {
    if (body.type === 'checkout.session.completed' && body.data.object.mode === 'subscription') {
      const workspaceId = body.data.object.metadata?.workspaceId
      const stripeCustomerId = body.data.object.customer as string
      const stripeSubscriptionId = body.data.object.subscription as string

      if (!workspaceId) throw new Error('Workspace Id not found')
      if (!stripeCustomerId) throw new Error('Stripe Customer Id not found')
      if (!stripeSubscriptionId) throw new Error('Stripe Subscription Id not found')

      await Actor.provide('system', { workspaceId }, async () => {
        const billing = await Billing.get()
        if (!billing) throw new Error('Billing not found')
        if (billing.stripeCustomerId && billing.stripeCustomerId !== stripeCustomerId)
          throw new Error('Stripe Customer Id mismatch')

        if (!billing.stripeCustomerId) {
          await Billing.stripe().customers.update(stripeCustomerId, {
            metadata: {
              workspaceId,
            },
          })
        }

        await Database.use((db) =>
          db
            .update(BillingTable)
            .set({
              stripeCustomerId,
              stripeSubscriptionId,
            })
            .where(eq(BillingTable.workspaceId, workspaceId)),
        )
      })
    }

    if (body.type === 'customer.subscription.created') {
      const stripeSubscription = body.data.object
      const workspaceId = stripeSubscription.metadata?.workspaceId
      const stripeCustomerId = stripeSubscription.customer as string
      const stripeSubscriptionId = stripeSubscription.id

      if (!workspaceId) throw new Error('Workspace Id not found')

      const stripeSubscriptionItems = stripeSubscription.items?.data ?? []
      const stripePlanSubscriptionItem = stripeSubscriptionItems.find((item) =>
        Billing.stripePriceIdToPlan(item.price.id),
      )
      const plan = stripePlanSubscriptionItem ? Billing.stripePriceIdToPlan(stripePlanSubscriptionItem.price.id) : null
      const interval = (stripePlanSubscriptionItem?.price.recurring?.interval ?? null) as 'month' | 'year' | null
      const managed = stripeSubscriptionItems.some((item) => item.price.id === Resource.BILLING.managedPriceId)

      if (!plan) throw new Error('Plan not found')
      if (!interval) throw new Error('Interval not found')

      // Add overage price to subscription (metered prices must be monthly, so we add them separately)
      const stripeOveragePriceId = Billing.planToStripeOveragePriceId(plan)
      if (stripeOveragePriceId) {
        const stripeOverageSubscriptionItem = stripeSubscriptionItems.find(
          (item) => item.price.id === stripeOveragePriceId,
        )
        if (!stripeOverageSubscriptionItem) {
          await Billing.stripe().subscriptionItems.create({
            subscription: stripeSubscriptionId,
            price: stripeOveragePriceId,
          })
        }
      }

      await Actor.provide('system', { workspaceId }, () =>
        Billing.subscribe({
          stripeCustomerId,
          stripeSubscriptionId,
          plan,
          managed,
          interval,
          lastSubscribedAt: new Date(stripeSubscription.created * 1000),
          ...(stripeSubscription.status === 'trialing' &&
            stripeSubscription.trial_start &&
            stripeSubscription.trial_end && {
              trialStartedAt: new Date(stripeSubscription.trial_start * 1000),
              trialEndsAt: new Date(stripeSubscription.trial_end * 1000),
            }),
        }),
      )
    }

    if (body.type === 'customer.subscription.updated' && body.data.object.status === 'incomplete_expired') {
      const stripeSubscription = body.data.object
      const stripeSubscriptionId = body.data.object.id
      const workspaceId = stripeSubscription.metadata?.workspaceId

      if (!stripeSubscriptionId) throw new Error('Stripe Subscription Id not found')
      if (!workspaceId) throw new Error('Workspace Id not found')

      await Actor.provide('system', { workspaceId }, async () => {
        await Billing.unsubscribe({ stripeSubscriptionId })
        await Funnel.unpublishAll()
      })
    }

    if (body.type === 'customer.subscription.deleted') {
      const stripeSubscription = body.data.object
      const stripeSubscriptionId = body.data.object.id
      const workspaceId = stripeSubscription.metadata?.workspaceId

      if (!stripeSubscriptionId) throw new Error('Stripe Subscription Id not found')
      if (!workspaceId) throw new Error('Workspace Id not found')

      await Actor.provide('system', { workspaceId }, async () => {
        await Billing.unsubscribe({ stripeSubscriptionId })
        await Funnel.unpublishAll()
      })
    }
  })()
    .then((message) => c.json({ message: message ?? 'ok' }, 200))
    .catch((error: any) => {
      console.error(error)
      return c.json({ message: error.message }, 500)
    })
})
