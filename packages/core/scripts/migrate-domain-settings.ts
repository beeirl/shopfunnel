import { and, desc, eq, isNull } from 'drizzle-orm'
import { parse } from 'node-html-parser'
import { Actor } from '../src/actor'
import { Database } from '../src/database'
import { type DomainSettings, DomainTable } from '../src/domain/index.sql'
import { File } from '../src/file'
import { FunnelTable, FunnelVersionTable } from '../src/funnel/index.sql'
import { Identifier } from '../src/identifier'
import { IntegrationTable } from '../src/integration/index.sql'

/**
 * Migration script: Populate domain.settings, create integrations, and link funnels to domains.
 *
 * This script must be run AFTER the schema migration that adds domain.settings,
 * funnel.domain_id, makes funnel.settings nullable, and adds meta_pixel to the
 * integration provider enum.
 *
 * Execution order:
 *   1. Run drizzle-kit generate + migrate
 *   2. Run this script
 *   3. Deploy new application code
 *
 * Usage:
 *   bun shell:prod scripts/migrate-domain-settings.ts --dry-run
 *   bun shell:prod scripts/migrate-domain-settings.ts
 */

interface LegacyTheme {
  logo?: string
  logoUrl?: string
  favicon?: { url: string; contentType: string }
  radius: string
  style: 'outline' | 'soft'
  colors: {
    primary: string
    primaryForeground: string
    background: string
    foreground: string
  }
}

const isDryRun = process.argv.includes('--dry-run')

if (isDryRun) {
  console.log('DRY RUN MODE - No changes will be made\n')
}

console.log('Starting domain settings migration...\n')

// ============================================
// Phase 1: Link funnels to their workspace's domain
// ============================================

console.log('--- Phase 1: Link funnels to domains ---')

const domains = await Database.use((tx) => tx.select().from(DomainTable).where(isNull(DomainTable.archivedAt)))

let funnelsLinked = 0
let phase1Skipped = 0
for (const domain of domains) {
  const funnels = await Database.use((tx) =>
    tx
      .select({ id: FunnelTable.id })
      .from(FunnelTable)
      .where(and(eq(FunnelTable.workspaceId, domain.workspaceId), isNull(FunnelTable.archivedAt))),
  )

  if (funnels.length === 0) {
    phase1Skipped++
    continue
  }

  console.log(`  Linking ${funnels.length} funnel(s) to ${domain.hostname}`)
  if (!isDryRun) {
    await Database.use((tx) =>
      tx
        .update(FunnelTable)
        .set({ domainId: domain.id })
        .where(and(eq(FunnelTable.workspaceId, domain.workspaceId), isNull(FunnelTable.archivedAt))),
    )
  }
  funnelsLinked += funnels.length
}

// ============================================
// Phase 2: Populate domain.settings from theme.favicon
// ============================================

console.log('--- Phase 2: Populate domain.settings from theme.favicon ---')

let settingsPopulated = 0
let phase2Skipped = 0
for (const domain of domains) {
  const existing = domain.settings ?? {}

  // Skip if domain already has a favicon
  if (existing.faviconUrl) {
    phase2Skipped++
    continue
  }

  const funnelVersions = await Database.use((tx) =>
    tx
      .select({
        funnelId: FunnelTable.id,
        theme: FunnelVersionTable.theme,
      })
      .from(FunnelTable)
      .innerJoin(
        FunnelVersionTable,
        and(
          eq(FunnelVersionTable.funnelId, FunnelTable.id),
          eq(FunnelVersionTable.workspaceId, FunnelTable.workspaceId),
          eq(FunnelVersionTable.version, FunnelTable.currentVersion),
        ),
      )
      .where(and(eq(FunnelTable.workspaceId, domain.workspaceId), isNull(FunnelTable.archivedAt)))
      .orderBy(desc(FunnelTable.updatedAt)),
  )

  if (funnelVersions.length === 0) {
    phase2Skipped++
    continue
  }

  // Find the first funnel version with a favicon
  let faviconUrl: string | null = null
  let faviconType: string | null = null

  for (const row of funnelVersions) {
    const theme = row.theme as LegacyTheme
    if (theme?.favicon?.url) {
      faviconUrl = theme.favicon.url
      faviconType = theme.favicon.contentType
      break
    }
  }

  if (!faviconUrl) {
    phase2Skipped++
    continue
  }

  console.log(`  ${domain.hostname}: favicon ${faviconUrl}`)

  if (!isDryRun) {
    const updated: DomainSettings = {
      ...existing,
      faviconUrl,
      faviconType,
    }
    await Database.use((tx) => tx.update(DomainTable).set({ settings: updated }).where(eq(DomainTable.id, domain.id)))
  }
  settingsPopulated++
}

// ============================================
// Phase 3: Subdomain scraping for missing data
// ============================================

console.log('--- Phase 3: Subdomain scraping ---')

// Re-fetch domains to get updated settings from Phase 2
const updatedDomains = await Database.use((tx) => tx.select().from(DomainTable).where(isNull(DomainTable.archivedAt)))

let scraped = 0
let phase3Skipped = 0
for (const domain of updatedDomains) {
  const hostname = domain.hostname
  const parts = hostname.split('.')

  // Only scrape subdomains (3+ parts)
  if (parts.length <= 2) {
    phase3Skipped++
    continue
  }

  const settings = domain.settings ?? {}

  // Check if we're missing any of: favicon, metaTitle, metaDescription, metaImageUrl
  const missingFavicon = !settings.faviconUrl
  const missingTitle = !settings.metaTitle
  const missingDescription = !settings.metaDescription
  const missingImageUrl = !settings.metaImageUrl

  if (!missingFavicon && !missingTitle && !missingDescription && !missingImageUrl) {
    phase3Skipped++
    continue
  }

  const parentDomain = parts.slice(-2).join('.')
  console.log(`  Scraping ${parentDomain} for ${hostname}`)

  if (isDryRun) {
    scraped++
    continue
  }

  try {
    const response = await fetch(`https://${parentDomain}`, {
      headers: { 'User-Agent': 'ShopFunnel/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    const text = await response.text()
    const html = parse(text)

    const updates: DomainSettings = {}

    // Title
    if (missingTitle) {
      const title =
        html.querySelector('title')?.textContent?.trim() ||
        html.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
        null
      if (title) {
        updates.metaTitle = title
      }
    }

    // Description
    if (missingDescription) {
      const description =
        html.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
        html.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() ||
        null
      if (description) {
        updates.metaDescription = description
      }
    }

    // Favicon (requires file upload via Actor context)
    if (missingFavicon) {
      const href =
        html.querySelector('link[rel="icon"]')?.getAttribute('href') ||
        html.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
        null
      if (href) {
        const faviconFullUrl = href.startsWith('http')
          ? href
          : `https://${parentDomain}${href.startsWith('/') ? '' : '/'}${href}`
        try {
          const file = await Actor.provide('system', { workspaceId: domain.workspaceId }, () =>
            File.createFromUrl({
              url: faviconFullUrl,
              name: 'favicon',
              cacheControl: 'public, max-age=31536000, immutable',
            }),
          )
          updates.faviconUrl = file.url
          updates.faviconType = file.contentType
        } catch (e) {
          console.error(`    Failed to download favicon: ${e instanceof Error ? e.message : 'unknown error'}`)
        }
      }
    }

    // Image URL (og:image)
    if (missingImageUrl) {
      const ogImageUrl = html.querySelector('meta[property="og:image"]')?.getAttribute('content')?.trim() || null
      if (ogImageUrl) {
        try {
          const file = await Actor.provide('system', { workspaceId: domain.workspaceId }, () =>
            File.createFromUrl({
              url: ogImageUrl,
              name: 'og-image',
              cacheControl: 'public, max-age=31536000, immutable',
            }),
          )
          updates.metaImageUrl = file.url
        } catch (e) {
          console.error(`    Failed to download og:image: ${e instanceof Error ? e.message : 'unknown error'}`)
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const merged: DomainSettings = { ...settings, ...updates }
      await Database.use((tx) => tx.update(DomainTable).set({ settings: merged }).where(eq(DomainTable.id, domain.id)))
      scraped++
    }
  } catch (e) {
    console.error(`  Failed to scrape ${parentDomain}: ${e instanceof Error ? e.message : 'unknown error'}`)
  }
}

// ============================================
// Phase 4: Migrate metaPixelId → integration table
// ============================================

console.log('--- Phase 4: Migrate metaPixelId to integration table ---')

const funnelsWithSettings = await Database.use((tx) =>
  tx
    .select({
      id: FunnelTable.id,
      workspaceId: FunnelTable.workspaceId,
      settings: FunnelTable.settings,
      title: FunnelTable.title,
    })
    .from(FunnelTable)
    .where(isNull(FunnelTable.archivedAt)),
)

let integrationsCreated = 0
let phase4Skipped = 0
const processedWorkspaces = new Set<string>()

for (const funnel of funnelsWithSettings) {
  const metaPixelId = (funnel.settings as { metaPixelId?: string } | null)?.metaPixelId
  if (!metaPixelId) continue

  // Skip if we already processed this workspace (multiple funnels may share the same pixel)
  if (processedWorkspaces.has(funnel.workspaceId)) {
    phase4Skipped++
    continue
  }
  processedWorkspaces.add(funnel.workspaceId)

  // Check if the workspace already has an active meta_pixel integration
  const existing = await Database.use((tx) =>
    tx
      .select({ id: IntegrationTable.id })
      .from(IntegrationTable)
      .where(
        and(
          eq(IntegrationTable.workspaceId, funnel.workspaceId),
          eq(IntegrationTable.provider, 'meta_pixel'),
          isNull(IntegrationTable.archivedAt),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]),
  )

  if (existing) {
    phase4Skipped++
    continue
  }

  console.log(`  Creating meta_pixel integration (pixel: ${metaPixelId}) for workspace ${funnel.workspaceId}`)

  if (!isDryRun) {
    await Database.use((tx) =>
      tx
        .insert(IntegrationTable)
        .values({
          id: Identifier.create('integration'),
          workspaceId: funnel.workspaceId,
          provider: 'meta_pixel',
          externalId: metaPixelId,
          credentials: {},
          metadata: { pixelId: metaPixelId },
        })
        .onDuplicateKeyUpdate({
          set: {
            metadata: { pixelId: metaPixelId },
            archivedAt: null,
          },
        }),
    )
  }
  integrationsCreated++
}

// ============================================
// Phase 5: Strip logo/favicon from theme JSON
// ============================================

console.log('--- Phase 5: Strip logo/favicon from funnel_version.theme ---')

const versionsWithThemeData = await Database.use((tx) =>
  tx
    .select({
      workspaceId: FunnelVersionTable.workspaceId,
      funnelId: FunnelVersionTable.funnelId,
      version: FunnelVersionTable.version,
      theme: FunnelVersionTable.theme,
    })
    .from(FunnelVersionTable),
)

let themesUpdated = 0
let phase5Skipped = 0
for (const row of versionsWithThemeData) {
  const theme = row.theme as LegacyTheme
  if (!theme?.logo && !theme?.favicon) {
    phase5Skipped++
    continue
  }

  const { logo, favicon, ...cleanTheme } = theme
  // Rename legacy logo → logoUrl if not already set
  if (logo && !cleanTheme.logoUrl) {
    cleanTheme.logoUrl = logo
  }

  if (!isDryRun) {
    await Database.use((tx) =>
      tx
        .update(FunnelVersionTable)
        .set({ theme: cleanTheme })
        .where(
          and(
            eq(FunnelVersionTable.workspaceId, row.workspaceId),
            eq(FunnelVersionTable.funnelId, row.funnelId),
            eq(FunnelVersionTable.version, row.version),
          ),
        ),
    )
  }
  themesUpdated++
}

// ============================================
// Summary
// ============================================

console.log('--- Summary ---')
console.log(`Phase 1: ${funnelsLinked} funnels linked to domains, ${phase1Skipped} domains skipped`)
console.log(`Phase 2: ${settingsPopulated} domain settings populated from theme.favicon, ${phase2Skipped} skipped`)
console.log(`Phase 3: ${scraped} subdomains scraped, ${phase3Skipped} skipped`)
console.log(`Phase 4: ${integrationsCreated} meta pixel integrations created, ${phase4Skipped} skipped`)
console.log(`Phase 5: ${themesUpdated} theme JSON entries cleaned, ${phase5Skipped} skipped`)

if (isDryRun) {
  console.log('\nDry run complete. Run without --dry-run to apply changes.')
} else {
  console.log('\nMigration complete!')
}
