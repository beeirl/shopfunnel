import { Actor } from '@shopfunnel/core/actor'
import { Billing } from '@shopfunnel/core/billing/index'
import { BillingTable } from '@shopfunnel/core/billing/index.sql'
import { Database } from '@shopfunnel/core/database/index'
import { and, isNotNull, isNull, lte, or } from 'drizzle-orm'

export default {
  async scheduled() {
    const now = new Date()
    const billableWorkspaces = await Database.use((tx) =>
      tx
        .select({
          id: BillingTable.workspaceId,
          stripeCustomerId: BillingTable.stripeCustomerId,
          usagePeriodStartedAt: BillingTable.usagePeriodStartedAt,
          usagePeriodEndsAt: BillingTable.usagePeriodEndsAt,
        })
        .from(BillingTable)
        .where(
          and(
            isNotNull(BillingTable.stripeSubscriptionId),
            isNotNull(BillingTable.stripeCustomerId),
            isNotNull(BillingTable.usagePeriodStartedAt),
            isNotNull(BillingTable.usagePeriodEndsAt),
            or(isNull(BillingTable.trialEndsAt), lte(BillingTable.trialEndsAt, now)),
          ),
        ),
    )

    for (const workspace of billableWorkspaces) {
      if (!workspace.stripeCustomerId) continue
      if (!workspace.usagePeriodStartedAt) continue
      if (!workspace.usagePeriodEndsAt) continue

      const end = workspace.usagePeriodEndsAt < now ? workspace.usagePeriodEndsAt : now

      await Actor.provide('system', { workspaceId: workspace.id }, () =>
        Billing.reportUsageToStripe({
          stripeCustomerId: workspace.stripeCustomerId!,
          start: workspace.usagePeriodStartedAt!,
          end,
        }),
      )
    }
  },
}
