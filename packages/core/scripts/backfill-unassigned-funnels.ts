import { and, asc, eq, isNull } from 'drizzle-orm'
import { CampaignFunnelTable, CampaignTable } from '../src/campaign/index.sql'
import { Database } from '../src/database'
import { DomainTable } from '../src/domain/index.sql'
import { FunnelTable } from '../src/funnel/index.sql'
import { Identifier } from '../src/identifier'
import { WorkspaceTable } from '../src/workspace/index.sql'

const DEFAULT_CAMPAIGN_NAME = 'Default campaign'
const isDryRun = process.argv.includes('--dry-run')

if (isDryRun) {
  console.log('DRY RUN MODE - No changes will be made\n')
}

console.log('Starting unassigned funnel backfill...\n')

const [workspaces, allFunnels, allDomains, defaultCampaigns, activeCampaignFunnels] = await Promise.all([
  Database.use((tx) =>
    tx
      .select({ id: WorkspaceTable.id, name: WorkspaceTable.name })
      .from(WorkspaceTable)
      .where(and(isNull(WorkspaceTable.archivedAt), isNull(WorkspaceTable.disabledAt))),
  ),
  Database.use((tx) =>
    tx
      .select({
        workspaceId: FunnelTable.workspaceId,
        id: FunnelTable.id,
        title: FunnelTable.title,
      })
      .from(FunnelTable)
      .where(isNull(FunnelTable.archivedAt)),
  ),
  Database.use((tx) =>
    tx
      .select({
        workspaceId: DomainTable.workspaceId,
        id: DomainTable.id,
      })
      .from(DomainTable)
      .where(isNull(DomainTable.archivedAt)),
  ),
  Database.use((tx) =>
    tx
      .select({
        workspaceId: CampaignTable.workspaceId,
        id: CampaignTable.id,
        defaultFunnelId: CampaignTable.defaultFunnelId,
      })
      .from(CampaignTable)
      .where(and(eq(CampaignTable.name, DEFAULT_CAMPAIGN_NAME), isNull(CampaignTable.archivedAt)))
      .orderBy(asc(CampaignTable.createdAt), asc(CampaignTable.id)),
  ),
  Database.use((tx) =>
    tx
      .select({
        workspaceId: CampaignFunnelTable.workspaceId,
        campaignId: CampaignFunnelTable.campaignId,
        funnelId: CampaignFunnelTable.funnelId,
      })
      .from(CampaignFunnelTable)
      .innerJoin(
        CampaignTable,
        and(
          eq(CampaignTable.workspaceId, CampaignFunnelTable.workspaceId),
          eq(CampaignTable.id, CampaignFunnelTable.campaignId),
          isNull(CampaignTable.archivedAt),
        ),
      )
      .innerJoin(
        FunnelTable,
        and(
          eq(FunnelTable.workspaceId, CampaignFunnelTable.workspaceId),
          eq(FunnelTable.id, CampaignFunnelTable.funnelId),
          isNull(FunnelTable.archivedAt),
        ),
      ),
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

const defaultCampaignsByWorkspace = new Map<
  string,
  {
    id: string
    defaultFunnelId: string | null
  }[]
>()

for (const campaign of defaultCampaigns) {
  const campaigns = defaultCampaignsByWorkspace.get(campaign.workspaceId) ?? []
  campaigns.push(campaign)
  defaultCampaignsByWorkspace.set(campaign.workspaceId, campaigns)
}

const assignedFunnelIdsByWorkspace = new Map<string, Set<string>>()
const activeFunnelIdsByCampaign = new Map<string, string[]>()

for (const row of activeCampaignFunnels) {
  const assignedFunnelIds = assignedFunnelIdsByWorkspace.get(row.workspaceId) ?? new Set<string>()
  assignedFunnelIds.add(row.funnelId)
  assignedFunnelIdsByWorkspace.set(row.workspaceId, assignedFunnelIds)

  const funnelIds = activeFunnelIdsByCampaign.get(row.campaignId) ?? []
  funnelIds.push(row.funnelId)
  activeFunnelIdsByCampaign.set(row.campaignId, funnelIds)
}

console.log(`Found ${workspaces.length} active workspace(s)\n`)

let workspacesUpdated = 0
let totalCampaignsCreated = 0
let totalCampaignsReused = 0
let totalDefaultFunnelsSet = 0
let totalFunnelsLinked = 0

for (const workspace of workspaces) {
  console.log(`--- Workspace: ${workspace.name} (${workspace.id}) ---`)

  const funnels = funnelsByWorkspace.get(workspace.id) ?? []

  if (funnels.length === 0) {
    console.log('  No funnels found, skipping.\n')
    continue
  }

  const assignedFunnelIds = assignedFunnelIdsByWorkspace.get(workspace.id) ?? new Set<string>()
  const unassignedFunnels = funnels.filter((funnel) => !assignedFunnelIds.has(funnel.id))

  if (unassignedFunnels.length === 0) {
    console.log('  No unassigned funnels found, skipping.\n')
    continue
  }

  const funnelTitleById = new Map(funnels.map((funnel) => [funnel.id, funnel.title]))
  const workspaceDefaultCampaigns = defaultCampaignsByWorkspace.get(workspace.id) ?? []
  const selectedDefaultCampaign = chooseDefaultCampaign(workspaceDefaultCampaigns)
  const existingDefaultCampaignFunnelIds = selectedDefaultCampaign
    ? (activeFunnelIdsByCampaign.get(selectedDefaultCampaign.id) ?? [])
    : []
  const nextDefaultFunnelId =
    selectedDefaultCampaign?.defaultFunnelId ?? existingDefaultCampaignFunnelIds[0] ?? unassignedFunnels[0]?.id ?? null
  const shouldCreateDefaultCampaign = selectedDefaultCampaign === null
  const shouldSetDefaultFunnel =
    selectedDefaultCampaign !== null && selectedDefaultCampaign.defaultFunnelId === null && nextDefaultFunnelId !== null

  console.log(`  Found ${unassignedFunnels.length} unassigned funnel(s)`)

  if (workspaceDefaultCampaigns.length > 1) {
    console.log(
      `  WARNING: Found ${workspaceDefaultCampaigns.length} active default campaigns. Reusing the oldest suitable campaign.`,
    )
  }

  if (shouldCreateDefaultCampaign) {
    console.log('  Creating default campaign')
  } else {
    console.log('  Reusing default campaign')
  }

  if (nextDefaultFunnelId !== null) {
    const defaultFunnelTitle = funnelTitleById.get(nextDefaultFunnelId) ?? nextDefaultFunnelId
    if (shouldSetDefaultFunnel) {
      console.log(`    Setting default funnel: ${defaultFunnelTitle}`)
    } else {
      console.log(`    Default funnel: ${defaultFunnelTitle}`)
    }
  }

  for (const funnel of unassignedFunnels) {
    console.log(`    - ${funnel.title}`)
  }

  if (!isDryRun) {
    await Database.transaction(async (tx) => {
      const defaultCampaignId = selectedDefaultCampaign?.id ?? Identifier.create('campaign')

      if (selectedDefaultCampaign === null) {
        const domainId = domainIdByWorkspace.get(workspace.id) ?? null

        await tx.insert(CampaignTable).values({
          id: defaultCampaignId,
          workspaceId: workspace.id,
          shortId: defaultCampaignId.slice(-8),
          name: DEFAULT_CAMPAIGN_NAME,
          defaultFunnelId: nextDefaultFunnelId,
          domainId,
        })
      } else if (shouldSetDefaultFunnel) {
        await tx
          .update(CampaignTable)
          .set({ defaultFunnelId: nextDefaultFunnelId })
          .where(and(eq(CampaignTable.workspaceId, workspace.id), eq(CampaignTable.id, selectedDefaultCampaign.id)))
      }

      await tx.insert(CampaignFunnelTable).values(
        unassignedFunnels.map((funnel) => ({
          workspaceId: workspace.id,
          campaignId: defaultCampaignId,
          funnelId: funnel.id,
        })),
      )
    })
  }

  workspacesUpdated++
  totalFunnelsLinked += unassignedFunnels.length

  if (shouldCreateDefaultCampaign) {
    totalCampaignsCreated++
  } else {
    totalCampaignsReused++
  }

  if (shouldSetDefaultFunnel) {
    totalDefaultFunnelsSet++
  }

  console.log()
}

console.log('--- Summary ---')
console.log(`Total workspaces processed: ${workspaces.length}`)
console.log(`Workspaces updated: ${isDryRun ? `${workspacesUpdated} (dry run)` : workspacesUpdated}`)
console.log(`Default campaigns created: ${isDryRun ? `${totalCampaignsCreated} (dry run)` : totalCampaignsCreated}`)
console.log(`Default campaigns reused: ${isDryRun ? `${totalCampaignsReused} (dry run)` : totalCampaignsReused}`)
console.log(`Default funnels set: ${isDryRun ? `${totalDefaultFunnelsSet} (dry run)` : totalDefaultFunnelsSet}`)
console.log(`Funnels linked: ${isDryRun ? `${totalFunnelsLinked} (dry run)` : totalFunnelsLinked}`)

if (isDryRun) {
  console.log('\nDry run complete. Run without --dry-run to apply changes.')
} else {
  console.log('\nBackfill complete!')
}

function chooseDefaultCampaign(
  campaigns: {
    id: string
    defaultFunnelId: string | null
  }[],
): {
  id: string
  defaultFunnelId: string | null
} | null {
  if (campaigns.length === 0) {
    return null
  }

  return campaigns.find((campaign) => campaign.defaultFunnelId !== null) ?? campaigns[0] ?? null
}
