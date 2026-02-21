import { Billing } from '@shopfunnel/core/billing/index'
import { BillingTable } from '@shopfunnel/core/billing/index.sql'
import { Database } from '@shopfunnel/core/database/index'
import { Resource } from '@shopfunnel/resource'
import { and, isNotNull, isNull, lte, or } from 'drizzle-orm'

export default {
  async scheduled() {
    const now = new Date()
    const nowTimestamp = Math.floor(now.getTime() / (60 * 60 * 1000))

    const workspaces = await Database.use((tx) =>
      tx
        .select({
          workspaceId: BillingTable.workspaceId,
          stripeCustomerId: BillingTable.stripeCustomerId,
          periodStartedAt: BillingTable.periodStartedAt,
        })
        .from(BillingTable)
        .where(
          and(
            isNotNull(BillingTable.stripeSubscriptionId),
            isNotNull(BillingTable.stripeCustomerId),
            isNotNull(BillingTable.periodStartedAt),
            or(isNull(BillingTable.trialEndsAt), lte(BillingTable.trialEndsAt, now)),
          ),
        ),
    )

    for (const workspace of workspaces) {
      // Compute the current monthly rolling window start.
      // For yearly subscriptions, periodStartedAt is the start of the year,
      // so we advance month-by-month to find the current monthly sub-period.
      let windowStart = new Date(workspace.periodStartedAt!)
      while (true) {
        const nextMonth = new Date(windowStart)
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        if (nextMonth.getDate() !== windowStart.getDate()) {
          nextMonth.setDate(0)
        }
        if (nextMonth > now) break
        windowStart = nextMonth
      }

      const url = new URL('https://api.us-east.aws.tinybird.co/v0/pipes/usages.json')
      url.search = new URLSearchParams({
        workspace_id: workspace.workspaceId,
        start_date: windowStart.toISOString(),
        end_date: now.toISOString(),
      }).toString()
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${Resource.TINYBIRD_TOKEN.value}` },
      })
      const json = (await response.json()) as any
      const visitors = json.data?.[0]?.visitors ?? 0

      await Billing.stripe().billing.meterEvents.create({
        event_name: 'visitors',
        identifier: `${workspace.workspaceId}-${nowTimestamp}`,
        timestamp: Math.floor(now.getTime() / 1000),
        payload: {
          stripe_customer_id: workspace.stripeCustomerId!,
          value: String(visitors),
        },
      })
    }
  },
}
