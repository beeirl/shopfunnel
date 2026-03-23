import { and, eq, isNull } from 'drizzle-orm'
import { CampaignFunnelTable, CampaignTable } from '../src/campaign/index.sql'
import { Database } from '../src/database'
import { DomainTable } from '../src/domain/index.sql'
import { FunnelTable } from '../src/funnel/index.sql'
import { Identifier } from '../src/identifier'
import { WorkspaceTable } from '../src/workspace/index.sql'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Define the campaign structure for a single workspace.
 *
 * If CAMPAIGNS is empty, all funnels in the workspace will be assigned to the
 * generated default campaign.
 *
 * Any funnel in a workspace that is NOT listed here will be assigned to a
 * "Default campaign" automatically.
 */
const TARGET_WORKSPACE_ID = 'wrk_01KJDWRDKK4RKXJC812Z9E6SX7'
const DEFAULT_FUNNEL_ID = ''
const DEFAULT_CAMPAIGN_NAME = 'Default campaign'

const CAMPAIGNS: {
  name: string
  funnelIds: string[]
  defaultFunnelId?: string
}[] = [
  {
    name: 'UWC Standard',
    funnelIds: ['fun_01KJDWRGFR4TS7M89AJ5Z5BG81'],
    defaultFunnelId: 'fun_01KJDWRGFR4TS7M89AJ5Z5BG81',
  },
  {
    name: 'UWC Special LP',
    funnelIds: ['fun_01KKQ20HAR9JE644D3RBCVWMVT'],
    defaultFunnelId: 'fun_01KKQ20HAR9JE644D3RBCVWMVT',
  },
]

// ---------------------------------------------------------------------------
// Script
// ---------------------------------------------------------------------------

const isDryRun = process.argv.includes('--dry-run')

if (!TARGET_WORKSPACE_ID) {
  throw new Error('Set TARGET_WORKSPACE_ID before running this script.')
}

if (isDryRun) {
  console.log('DRY RUN MODE - No changes will be made\n')
}

console.log('Starting campaign backfill...\n')

const [workspaces, allFunnels, allDomains, allCampaigns] = await Promise.all([
  Database.use((tx) =>
    tx
      .select({ id: WorkspaceTable.id, name: WorkspaceTable.name })
      .from(WorkspaceTable)
      .where(
        and(
          eq(WorkspaceTable.id, TARGET_WORKSPACE_ID),
          isNull(WorkspaceTable.archivedAt),
          isNull(WorkspaceTable.disabledAt),
        ),
      ),
  ),
  Database.use((tx) =>
    tx
      .select({
        workspaceId: FunnelTable.workspaceId,
        id: FunnelTable.id,
        title: FunnelTable.title,
      })
      .from(FunnelTable)
      .where(and(eq(FunnelTable.workspaceId, TARGET_WORKSPACE_ID), isNull(FunnelTable.archivedAt))),
  ),
  Database.use((tx) =>
    tx
      .select({
        workspaceId: DomainTable.workspaceId,
        id: DomainTable.id,
      })
      .from(DomainTable)
      .where(and(eq(DomainTable.workspaceId, TARGET_WORKSPACE_ID), isNull(DomainTable.archivedAt))),
  ),
  Database.use((tx) =>
    tx
      .select({
        workspaceId: CampaignTable.workspaceId,
        id: CampaignTable.id,
      })
      .from(CampaignTable)
      .where(and(eq(CampaignTable.workspaceId, TARGET_WORKSPACE_ID), isNull(CampaignTable.archivedAt))),
  ),
])

const funnelsByWorkspace = new Map<string, { id: string; title: string }[]>()
for (const funnel of allFunnels) {
  const funnels = funnelsByWorkspace.get(funnel.workspaceId) ?? []
  funnels.push({ id: funnel.id, title: funnel.title })
  funnelsByWorkspace.set(funnel.workspaceId, funnels)
}

const domainIdByWorkspace = new Map<string, string>()
for (const domain of allDomains) {
  if (!domainIdByWorkspace.has(domain.workspaceId)) {
    domainIdByWorkspace.set(domain.workspaceId, domain.id)
  }
}

const existingCampaignsByWorkspace = new Map<string, number>()
for (const campaign of allCampaigns) {
  existingCampaignsByWorkspace.set(
    campaign.workspaceId,
    (existingCampaignsByWorkspace.get(campaign.workspaceId) ?? 0) + 1,
  )
}

console.log(`Found ${workspaces.length} active workspace(s)\n`)

let totalCampaignsCreated = 0
let totalFunnelsLinked = 0

for (const workspace of workspaces) {
  console.log(`--- Workspace: ${workspace.name} (${workspace.id}) ---`)

  const funnels = funnelsByWorkspace.get(workspace.id) ?? []

  if (funnels.length === 0) {
    console.log('  No funnels found, skipping.\n')
    continue
  }

  console.log(`  Found ${funnels.length} funnel(s)`)

  const domainId = domainIdByWorkspace.get(workspace.id) ?? null
  const existingCampaignCount = existingCampaignsByWorkspace.get(workspace.id) ?? 0

  if (existingCampaignCount > 0) {
    console.log(`  Already has ${existingCampaignCount} campaign(s), skipping.\n`)
    continue
  }

  const funnelIdsInWorkspace = new Set(funnels.map((f) => f.id))
  const funnelTitleById = new Map(funnels.map((f) => [f.id, f.title]))
  const assignedFunnelIds = new Set<string>()

  const campaignsToCreate: {
    id: string
    shortId: string
    name: string
    funnelIds: string[]
    defaultFunnelId: string | null
  }[] = []

  for (const campaign of CAMPAIGNS) {
    const validFunnelIds: string[] = []
    const invalidFunnelIds: string[] = []
    const duplicateFunnelIds: string[] = []

    for (const funnelId of campaign.funnelIds) {
      if (!funnelIdsInWorkspace.has(funnelId)) {
        invalidFunnelIds.push(funnelId)
        continue
      }

      if (assignedFunnelIds.has(funnelId)) {
        duplicateFunnelIds.push(funnelId)
        continue
      }

      validFunnelIds.push(funnelId)
      assignedFunnelIds.add(funnelId)
    }

    if (invalidFunnelIds.length > 0) {
      console.log(`  WARNING: Campaign "${campaign.name}" references unknown funnels: ${invalidFunnelIds.join(', ')}`)
    }

    if (duplicateFunnelIds.length > 0) {
      console.log(
        `  WARNING: Campaign "${campaign.name}" references funnels already assigned earlier: ${duplicateFunnelIds.join(', ')}`,
      )
    }

    if (validFunnelIds.length === 0) {
      continue
    }

    const fallbackDefaultFunnelId = validFunnelIds[0] ?? null
    const hasValidDefaultFunnelId =
      campaign.defaultFunnelId !== undefined && validFunnelIds.includes(campaign.defaultFunnelId)

    if (campaign.defaultFunnelId !== undefined && !hasValidDefaultFunnelId) {
      console.log(
        `  WARNING: Campaign "${campaign.name}" default funnel is not part of the final funnel list. Falling back to the first funnel.`,
      )
    }

    const campaignId = Identifier.create('campaign')
    campaignsToCreate.push({
      id: campaignId,
      shortId: campaignId.slice(-8),
      name: campaign.name,
      funnelIds: validFunnelIds,
      defaultFunnelId: hasValidDefaultFunnelId ? (campaign.defaultFunnelId ?? null) : fallbackDefaultFunnelId,
    })
  }

  const unmappedFunnelIds = funnels.filter((f) => !assignedFunnelIds.has(f.id)).map((f) => f.id)

  if (unmappedFunnelIds.length > 0) {
    const hasValidDefaultCampaignFunnelId =
      DEFAULT_FUNNEL_ID.length > 0 && unmappedFunnelIds.includes(DEFAULT_FUNNEL_ID)

    if (DEFAULT_FUNNEL_ID.length > 0 && !hasValidDefaultCampaignFunnelId) {
      console.log(
        `  WARNING: Default campaign default funnel is not part of the remaining funnel list. Falling back to the first funnel.`,
      )
    }

    const campaignId = Identifier.create('campaign')
    campaignsToCreate.push({
      id: campaignId,
      shortId: campaignId.slice(-8),
      name: DEFAULT_CAMPAIGN_NAME,
      funnelIds: unmappedFunnelIds,
      defaultFunnelId: hasValidDefaultCampaignFunnelId ? DEFAULT_FUNNEL_ID : (unmappedFunnelIds[0] ?? null),
    })
  }

  for (const plan of campaignsToCreate) {
    console.log(`  Creating campaign "${plan.name}" with ${plan.funnelIds.length} funnel(s)`)

    if (plan.defaultFunnelId !== null) {
      const defaultFunnelTitle = funnelTitleById.get(plan.defaultFunnelId) ?? plan.defaultFunnelId
      console.log(`    Default funnel: ${defaultFunnelTitle}`)
    }

    for (const fid of plan.funnelIds) {
      const funnelTitle = funnelTitleById.get(fid) ?? fid
      console.log(`    - ${funnelTitle}`)
    }
  }

  if (!isDryRun && campaignsToCreate.length > 0) {
    await Database.transaction(async (tx) => {
      await tx.insert(CampaignTable).values(
        campaignsToCreate.map((plan) => ({
          id: plan.id,
          workspaceId: workspace.id,
          shortId: plan.shortId,
          name: plan.name,
          defaultFunnelId: plan.defaultFunnelId,
          domainId,
        })),
      )

      const campaignFunnelRows = campaignsToCreate.flatMap((plan) =>
        plan.funnelIds.map((funnelId) => ({
          workspaceId: workspace.id,
          campaignId: plan.id,
          funnelId,
        })),
      )

      if (campaignFunnelRows.length > 0) {
        await tx.insert(CampaignFunnelTable).values(campaignFunnelRows)
      }
    })
  }

  for (const plan of campaignsToCreate) {
    totalCampaignsCreated++
    totalFunnelsLinked += plan.funnelIds.length
  }

  if (campaignsToCreate.length === 0) {
    console.log('  No campaigns to create, skipping.\n')
    continue
  }

  existingCampaignsByWorkspace.set(workspace.id, campaignsToCreate.length)

  console.log()
}

// Summary
console.log('--- Summary ---')
console.log(`Total workspaces processed: ${workspaces.length}`)
console.log(`Campaigns created: ${isDryRun ? `${totalCampaignsCreated} (dry run)` : totalCampaignsCreated}`)
console.log(`Funnels linked: ${isDryRun ? `${totalFunnelsLinked} (dry run)` : totalFunnelsLinked}`)

if (isDryRun) {
  console.log('\nDry run complete. Run without --dry-run to apply changes.')
} else {
  console.log('\nBackfill complete!')
}
