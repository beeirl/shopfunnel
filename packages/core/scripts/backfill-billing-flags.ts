import { eq, isNull } from 'drizzle-orm'
import { BillingTable } from '../src/billing/index.sql'
import { Database } from '../src/database'
import { Identifier } from '../src/identifier'
import { WorkspaceTable } from '../src/workspace/index.sql'

const isDryRun = process.argv.includes('--dry-run')

if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n')
}

console.log('Starting backfill for billing and flags...\n')

await Database.use(async (tx) => {
  // 1. Find all workspaces
  const workspaces = await tx
    .select({
      id: WorkspaceTable.id,
      name: WorkspaceTable.name,
      flags: WorkspaceTable.flags,
    })
    .from(WorkspaceTable)
    .where(isNull(WorkspaceTable.archivedAt))

  console.log(`Found ${workspaces.length} active workspace(s)\n`)

  // 2. Find workspaces without billing records
  const existingBilling = await tx.select({ workspaceId: BillingTable.workspaceId }).from(BillingTable)

  const workspacesWithBilling = new Set(existingBilling.map((b) => b.workspaceId))
  const workspacesNeedingBilling = workspaces.filter((w) => !workspacesWithBilling.has(w.id))

  console.log(`Workspaces needing billing records: ${workspacesNeedingBilling.length}`)

  // 3. Create billing records for workspaces that don't have one
  if (workspacesNeedingBilling.length > 0) {
    for (const workspace of workspacesNeedingBilling) {
      console.log(`  - Creating billing for workspace: ${workspace.name} (${workspace.id})`)

      if (!isDryRun) {
        await tx.insert(BillingTable).values({
          id: Identifier.create('billing'),
          workspaceId: workspace.id,
          exempted: true,
        })
      }
    }
    console.log()
  }

  // 4. Update all workspace flags to mark onboarding as completed
  const workspacesNeedingFlagUpdate = workspaces.filter((w) => !w.flags?.onboardingCompleted)

  console.log(`Workspaces needing onboarding flag update: ${workspacesNeedingFlagUpdate.length}`)

  if (workspacesNeedingFlagUpdate.length > 0) {
    for (const workspace of workspacesNeedingFlagUpdate) {
      console.log(`  - Updating flags for workspace: ${workspace.name} (${workspace.id})`)

      if (!isDryRun) {
        await tx
          .update(WorkspaceTable)
          .set({
            flags: { onboardingCompleted: true },
          })
          .where(eq(WorkspaceTable.id, workspace.id))
      }
    }
    console.log()
  }

  // Summary
  console.log('--- Summary ---')
  console.log(`Total workspaces: ${workspaces.length}`)
  console.log(
    `Billing records created: ${isDryRun ? `${workspacesNeedingBilling.length} (dry run)` : workspacesNeedingBilling.length}`,
  )
  console.log(
    `Flags updated: ${isDryRun ? `${workspacesNeedingFlagUpdate.length} (dry run)` : workspacesNeedingFlagUpdate.length}`,
  )

  if (isDryRun) {
    console.log('\n✅ Dry run complete. Run without --dry-run to apply changes.')
  } else {
    console.log('\n✅ Backfill complete!')
  }
})
