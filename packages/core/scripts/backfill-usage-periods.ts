import { and, eq, isNotNull, isNull, or } from 'drizzle-orm'
import { Billing } from '../src/billing/index'
import { BillingTable } from '../src/billing/index.sql'
import { Database } from '../src/database'

const isDryRun = process.argv.includes('--dry-run')

if (isDryRun) {
  console.log('DRY RUN MODE - No changes will be made\n')
}

console.log('Starting backfill for usage periods...\n')

await Database.use(async (tx) => {
  const workspaces = await tx
    .select({
      id: BillingTable.workspaceId,
      stripeSubscriptionId: BillingTable.stripeSubscriptionId,
      usagePeriodStartedAt: BillingTable.usagePeriodStartedAt,
      usagePeriodEndsAt: BillingTable.usagePeriodEndsAt,
    })
    .from(BillingTable)
    .where(
      and(
        isNotNull(BillingTable.stripeSubscriptionId),
        or(isNull(BillingTable.usagePeriodStartedAt), isNull(BillingTable.usagePeriodEndsAt)),
      ),
    )

  console.log(`Found ${workspaces.length} workspace(s) missing usage periods\n`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const workspace of workspaces) {
    if (!workspace.stripeSubscriptionId) continue

    try {
      const stripeSubscription = await Billing.stripe().subscriptions.retrieve(workspace.stripeSubscriptionId)

      const stripeUsageItem = stripeSubscription.items.data.find((item) =>
        Billing.stripeUsagePriceIdToPlan(item.price.id),
      )

      if (!stripeUsageItem) {
        console.log(`  [WARN] ${workspace.id} - No usage item found on subscription ${workspace.stripeSubscriptionId}`)
        skipped++
        continue
      }

      const usagePeriodStartedAt = new Date(stripeUsageItem.current_period_start * 1000)
      const usagePeriodEndsAt = new Date(stripeUsageItem.current_period_end * 1000)

      console.log(
        `  [OK] ${workspace.id} - ${usagePeriodStartedAt.toISOString()} -> ${usagePeriodEndsAt.toISOString()}`,
      )

      if (!isDryRun) {
        await tx
          .update(BillingTable)
          .set({ usagePeriodStartedAt, usagePeriodEndsAt })
          .where(eq(BillingTable.workspaceId, workspace.id))
      }

      updated++
    } catch (error: any) {
      console.log(`  [ERR] ${workspace.id} - ${error.message}`)
      failed++
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Total missing: ${workspaces.length}`)
  console.log(`Updated: ${isDryRun ? `${updated} (dry run)` : updated}`)
  console.log(`Skipped (no usage item): ${skipped}`)
  console.log(`Failed: ${failed}`)

  if (isDryRun) {
    console.log('\nDry run complete. Run without --dry-run to apply changes.')
  } else {
    console.log('\nBackfill complete!')
  }
})
