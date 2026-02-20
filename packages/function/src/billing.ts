import { Billing } from '@shopfunnel/core/billing/index'
import { BillingTable } from '@shopfunnel/core/billing/index.sql'
import { Database } from '@shopfunnel/core/database/index'
import { Resource } from '@shopfunnel/resource'
import { inArray } from 'drizzle-orm'

export default {
  async scheduled() {
    const now = Date.now()
    const hourMs = 60 * 60 * 1000
    const windowEndDate = new Date(Math.floor(now / hourMs) * hourMs)
    const windowStartDate = new Date(windowEndDate.getTime() - hourMs)
    const windowEndTimestamp = Math.floor(windowEndDate.getTime() / 1000)

    const usagesResponse = await fetch(
      `https://api.us-east.aws.tinybird.co/v0/pipes/usages.json?start_date=${windowStartDate.toISOString()}&end_date=${windowEndDate.toISOString()}`,
      {
        headers: { Authorization: `Bearer ${Resource.TINYBIRD_TOKEN.value}` },
      },
    )
    const usagesJson = (await usagesResponse.json()) as any
    const usages = usagesJson.data
    if (usages.length === 0) return

    const workspaceIds = usages.map((usage: any) => usage.workspace_id)
    const billingByWorkspace = await Database.use((tx) =>
      tx
        .select({
          workspaceId: BillingTable.workspaceId,
          stripeCustomerId: BillingTable.stripeCustomerId,
          trialEndsAt: BillingTable.trialEndsAt,
        })
        .from(BillingTable)
        .where(inArray(BillingTable.workspaceId, workspaceIds))
        .then((rows) => new Map(rows.map((row) => [row.workspaceId, row]))),
    )

    for (const usage of usages) {
      const billing = billingByWorkspace.get(usage.workspace_id)
      if (!billing?.stripeCustomerId) continue
      if (billing.trialEndsAt && billing.trialEndsAt > new Date()) continue

      await Billing.stripe().billing.meterEvents.create({
        event_name: 'sessions',
        identifier: `${usage.workspace_id}-${windowEndTimestamp}`,
        timestamp: windowEndTimestamp,
        payload: {
          stripe_customer_id: billing.stripeCustomerId,
          value: String(usage.sessions),
        },
      })
    }
  },
}
