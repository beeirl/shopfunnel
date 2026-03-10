import { and, eq, isNull } from 'drizzle-orm'
import { Database } from '../src/database'
import {
  FunnelReleaseTable,
  FunnelTable,
  FunnelVariantDraftTable,
  FunnelVariantTable,
  FunnelVariantVersionTable,
  FunnelVersionTable,
} from '../src/funnel/index.sql'
import { Identifier } from '../src/identifier'
import { QuestionTable } from '../src/question/index.sql'
import { SubmissionTable } from '../src/submission/index.sql'

/**
 * Migration script: Migrate existing funnels to the variant/release system.
 *
 * For each non-archived funnel, this script:
 *   1. Creates a "Main" funnel_variant
 *   2. Creates a funnel_variant_draft from the current version data
 *   3. Creates a funnel_variant_version from the published version data (if published)
 *   4. Creates a funnel_release with 100% traffic to the main variant (if published)
 *   5. Sets funnel.active_release_id to the new release
 *   6. Backfills question.funnel_variant_id for existing questions
 *   7. Backfills submission.funnel_variant_id for existing submissions
 *
 * This script must be run AFTER the schema migration that adds the new tables
 * and columns, but BEFORE deploying new application code.
 *
 * Execution order:
 *   1. Run drizzle-kit generate + migrate
 *   2. Run this script
 *   3. Deploy Tinybird changes
 *   4. Deploy new application code
 *
 * Usage:
 *   sst shell --stage production -- bun packages/core/scripts/migrate-to-variants.ts --dry-run
 *   sst shell --stage production -- bun packages/core/scripts/migrate-to-variants.ts
 */

const isDryRun = process.argv.includes('--dry-run')

if (isDryRun) {
  console.log('DRY RUN MODE - No changes will be made\n')
}

console.log('Starting variant migration...\n')

// ============================================
// Fetch all non-archived funnels with their versions
// ============================================

const funnels = await Database.use((tx) => tx.select().from(FunnelTable).where(isNull(FunnelTable.archivedAt)))

console.log(`Found ${funnels.length} non-archived funnel(s)\n`)

let variantsCreated = 0
let draftsCreated = 0
let versionsCreated = 0
let releasesCreated = 0
let questionsUpdated = 0
let submissionsUpdated = 0
let skipped = 0

for (const funnel of funnels) {
  // Check if this funnel already has variants (idempotent)
  const existingVariants = await Database.use((tx) =>
    tx
      .select({ id: FunnelVariantTable.id })
      .from(FunnelVariantTable)
      .where(and(eq(FunnelVariantTable.workspaceId, funnel.workspaceId), eq(FunnelVariantTable.funnelId, funnel.id)))
      .limit(1),
  )

  if (existingVariants.length > 0) {
    console.log(`  Skipping ${funnel.title} (${funnel.id}) - already has variants`)
    skipped++
    continue
  }

  // Get the current version data
  const currentVersion = funnel.currentVersion
    ? await Database.use((tx) =>
        tx
          .select()
          .from(FunnelVersionTable)
          .where(
            and(
              eq(FunnelVersionTable.workspaceId, funnel.workspaceId),
              eq(FunnelVersionTable.funnelId, funnel.id),
              eq(FunnelVersionTable.version, funnel.currentVersion!),
            ),
          )
          .then((rows) => rows[0]),
      )
    : undefined

  if (!currentVersion) {
    console.log(`  Skipping ${funnel.title} (${funnel.id}) - no current version found`)
    skipped++
    continue
  }

  // Get the published version data (if different from current)
  const publishedVersion =
    funnel.publishedVersion && funnel.publishedVersion !== funnel.currentVersion
      ? await Database.use((tx) =>
          tx
            .select()
            .from(FunnelVersionTable)
            .where(
              and(
                eq(FunnelVersionTable.workspaceId, funnel.workspaceId),
                eq(FunnelVersionTable.funnelId, funnel.id),
                eq(FunnelVersionTable.version, funnel.publishedVersion!),
              ),
            )
            .then((rows) => rows[0]),
        )
      : funnel.publishedVersion === funnel.currentVersion
        ? currentVersion
        : undefined

  const variantId = Identifier.create('funnel_variant')
  const isPublished = funnel.publishedVersion !== null && funnel.publishedVersion !== undefined

  console.log(
    `  Migrating ${funnel.title} (${funnel.id}): ` +
      `currentVersion=${funnel.currentVersion}, publishedVersion=${funnel.publishedVersion ?? 'none'}`,
  )

  if (!isDryRun) {
    await Database.use(async (tx) => {
      // 1. Create the "Main" variant
      await tx.insert(FunnelVariantTable).values({
        id: variantId,
        workspaceId: funnel.workspaceId,
        funnelId: funnel.id,
        title: 'Main',
        hasDraft: funnel.currentVersion !== funnel.publishedVersion,
      })
      variantsCreated++

      // 2. Create the variant draft from current version
      await tx.insert(FunnelVariantDraftTable).values({
        id: Identifier.create('funnel_variant_draft'),
        workspaceId: funnel.workspaceId,
        funnelId: funnel.id,
        funnelVariantId: variantId,
        pages: currentVersion.pages,
        rules: currentVersion.rules,
        variables: currentVersion.variables,
        theme: currentVersion.theme,
      })
      draftsCreated++

      // 3. Create a variant version from the published version (if published)
      if (isPublished && publishedVersion) {
        await tx.insert(FunnelVariantVersionTable).values({
          workspaceId: funnel.workspaceId,
          funnelId: funnel.id,
          funnelVariantId: variantId,
          number: 1,
          pages: publishedVersion.pages,
          rules: publishedVersion.rules,
          variables: publishedVersion.variables,
          theme: publishedVersion.theme,
        })
        versionsCreated++

        // 4. Create a release with 100% traffic
        const releaseId = Identifier.create('funnel_release')
        await tx.insert(FunnelReleaseTable).values({
          id: releaseId,
          workspaceId: funnel.workspaceId,
          funnelId: funnel.id,
          trafficSplit: [{ funnelVariantId: variantId, percentage: 100 }],
        })
        releasesCreated++

        // 5. Set funnel.active_release_id
        await tx
          .update(FunnelTable)
          .set({ activeReleaseId: releaseId })
          .where(and(eq(FunnelTable.workspaceId, funnel.workspaceId), eq(FunnelTable.id, funnel.id)))
      }

      // 6. Backfill question.funnel_variant_id
      const result = await tx
        .update(QuestionTable)
        .set({ funnelVariantId: variantId })
        .where(and(eq(QuestionTable.workspaceId, funnel.workspaceId), eq(QuestionTable.funnelId, funnel.id)))
      questionsUpdated += result[0].affectedRows ?? 0

      // 7. Backfill submission.funnel_variant_id
      const subResult = await tx
        .update(SubmissionTable)
        .set({ funnelVariantId: variantId })
        .where(and(eq(SubmissionTable.workspaceId, funnel.workspaceId), eq(SubmissionTable.funnelId, funnel.id)))
      submissionsUpdated += subResult[0].affectedRows ?? 0
    })
  } else {
    variantsCreated++
    draftsCreated++
    if (isPublished) {
      versionsCreated++
      releasesCreated++
    }
  }
}

// ============================================
// Summary
// ============================================

console.log('\n--- Summary ---')
console.log(`Funnels processed: ${funnels.length}`)
console.log(`Skipped (already migrated): ${skipped}`)
console.log(`Variants created: ${variantsCreated}`)
console.log(`Drafts created: ${draftsCreated}`)
console.log(`Versions created: ${versionsCreated}`)
console.log(`Releases created: ${releasesCreated}`)
console.log(`Questions backfilled: ${questionsUpdated}`)
console.log(`Submissions backfilled: ${submissionsUpdated}`)

if (isDryRun) {
  console.log('\nDry run complete. Run without --dry-run to apply changes.')
} else {
  console.log('\nMigration complete!')
}
