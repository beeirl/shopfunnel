import { Resource } from '@shopfunnel/resource'
import { and, eq, isNull } from 'drizzle-orm'
import { parse } from 'node-html-parser'
import { z } from 'zod'
import { Actor } from '../actor'
import { Billing } from '../billing/index'
import { Database } from '../database'
import { File } from '../file'
import { FunnelTable } from '../funnel/index.sql'
import { Identifier } from '../identifier'
import { fn } from '../utils/fn'
import { type DomainSettings, DomainTable } from './index.sql'

export namespace Domain {
  export const fromId = fn(Identifier.schema('domain'), async (id) =>
    Database.use((tx) =>
      tx
        .select()
        .from(DomainTable)
        .where(and(eq(DomainTable.workspaceId, Actor.workspaceId()), eq(DomainTable.id, id)))
        .then((rows) => rows[0]),
    ),
  )

  export const get = fn(z.void(), async () =>
    Database.use((tx) =>
      tx
        .select()
        .from(DomainTable)
        .where(and(eq(DomainTable.workspaceId, Actor.workspaceId()), isNull(DomainTable.archivedAt)))
        .then((rows) => rows[0]),
    ),
  )

  export const create = fn(
    z.object({
      hostname: z.string(),
    }),
    async (input) => {
      await Billing.assert()
      const hostname = input.hostname.toLowerCase()

      // Check if workspace already has a domain
      const existingDomain = await Database.use((tx) =>
        tx
          .select()
          .from(DomainTable)
          .where(and(eq(DomainTable.workspaceId, Actor.workspaceId()), isNull(DomainTable.archivedAt)))
          .then((rows) => rows[0]),
      )
      if (existingDomain) {
        throw new Error('A domain already exists for this workspace. Remove it before adding a new one.')
      }

      // Check if hostname is claimed by another workspace
      const claimedDomain = await Database.use((tx) =>
        tx
          .select()
          .from(DomainTable)
          .where(and(eq(DomainTable.hostname, hostname), isNull(DomainTable.archivedAt)))
          .then((rows) => rows[0]),
      )
      if (claimedDomain) {
        throw new Error('This hostname is already in use by another workspace.')
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${Resource.CLOUDFLARE_ZONE_ID.value}/custom_hostnames`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Resource.CLOUDFLARE_SSL_API_TOKEN.value}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hostname,
            ssl: {
              method: 'http',
              type: 'dv',
              settings: {
                min_tls_version: '1.2',
              },
            },
            custom_origin_server: 'shopfunnel.com',
          }),
        },
      )
      const json = (await response.json()) as any
      if (!json.success || !json.result) {
        const errorMessage = json.errors?.[0]?.message || 'Failed to create custom hostname in Cloudflare'
        throw new Error(errorMessage)
      }
      const cloudflareHostnameId = json.result.id

      const id = Identifier.create('domain')

      const settings = await (async (): Promise<DomainSettings | undefined> => {
        try {
          const parts = hostname.split('.')
          if (parts.length > 2) {
            const domain = parts.slice(-2).join('.')
            const response = await fetch(`https://${domain}`, {
              headers: { 'User-Agent': 'ShopFunnel/1.0' },
              signal: AbortSignal.timeout(5000),
            })
            const text = await response.text()
            const html = parse(text)

            const metaTitle =
              html.querySelector('title')?.textContent?.trim() ||
              html.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
              null

            const metaDescription =
              html.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
              html.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() ||
              null

            const { faviconUrl, faviconType } = await (async () => {
              const href =
                html.querySelector('link[rel="icon"]')?.getAttribute('href') ||
                html.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
                null
              if (!href) return { faviconUrl: undefined, faviconType: undefined }
              const url = href.startsWith('http') ? href : `https://${domain}${href.startsWith('/') ? '' : '/'}${href}`
              try {
                const file = await File.createFromUrl({
                  url,
                  name: 'favicon',
                  cacheControl: 'public, max-age=31536000, immutable',
                })
                return { faviconUrl: file.url, faviconType: file.contentType }
              } catch {
                return { faviconUrl: undefined, faviconType: undefined }
              }
            })()

            const metaImageUrl = await (async () => {
              const url = html.querySelector('meta[property="og:image"]')?.getAttribute('content')?.trim() || null
              if (!url) return null
              try {
                const file = await File.createFromUrl({
                  url,
                  name: 'og-image',
                  cacheControl: 'public, max-age=31536000, immutable',
                })
                return file.url
              } catch {
                return null
              }
            })()

            return {
              metaTitle,
              metaDescription,
              faviconUrl,
              faviconType,
              metaImageUrl,
            }
          }
        } catch {}
      })()

      await Database.use(async (tx) => {
        await tx.insert(DomainTable).values({
          id,
          workspaceId: Actor.workspaceId(),
          hostname,
          cloudflareHostnameId,
          settings: settings ?? {},
        })

        // Link all existing funnels without a domain to the new domain
        await tx
          .update(FunnelTable)
          .set({ domainId: id })
          .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), isNull(FunnelTable.domainId)))
      })

      return id
    },
  )

  export const remove = fn(z.void(), async () => {
    const domain = await Database.use((tx) =>
      tx
        .select()
        .from(DomainTable)
        .where(and(eq(DomainTable.workspaceId, Actor.workspace())))
        .then((rows) => rows[0]),
    )
    if (!domain) {
      throw new Error('No custom domain found for this workspace.')
    }

    if (domain.cloudflareHostnameId) {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${Resource.CLOUDFLARE_ZONE_ID.value}/custom_hostnames/${domain.cloudflareHostnameId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${Resource.CLOUDFLARE_SSL_API_TOKEN.value}`,
          },
        },
      )
      const json = (await response.json()) as any
      if (!json.success && json.errors?.[0]?.code !== 1410) {
        const errorMessage = json.errors?.[0]?.message || 'Failed to delete custom hostname from Cloudflare'
        throw new Error(errorMessage)
      }
    }

    await Database.use((tx) =>
      tx
        .delete(DomainTable)
        .where(and(eq(DomainTable.workspaceId, Actor.workspaceId()), eq(DomainTable.id, domain.id))),
    )
  })

  export const getSettings = fn(Identifier.schema('domain'), async (domainId) =>
    Database.use((tx) =>
      tx
        .select({ settings: DomainTable.settings })
        .from(DomainTable)
        .where(and(eq(DomainTable.workspaceId, Actor.workspaceId()), eq(DomainTable.id, domainId)))
        .then((rows) => rows[0]?.settings ?? null),
    ),
  )

  export const updateSettings = fn(
    z.object({
      domainId: Identifier.schema('domain'),
      faviconUrl: z.string().nullish(),
      faviconType: z.string().nullish(),
      customCode: z.string().nullish(),
      metaTitle: z.string().nullish(),
      metaDescription: z.string().nullish(),
      metaImageUrl: z.string().nullish(),
    }),
    async (input) => {
      const domain = await Database.use((tx) =>
        tx
          .select()
          .from(DomainTable)
          .where(and(eq(DomainTable.workspaceId, Actor.workspaceId()), eq(DomainTable.id, input.domainId)))
          .then((rows) => rows[0]),
      )
      if (!domain) {
        throw new Error('Domain not found.')
      }

      const existing = domain.settings ?? {}

      if (input.faviconUrl !== undefined && existing.faviconUrl) {
        try {
          await File.remove(existing.faviconUrl)
        } catch {}
      }
      if (input.metaImageUrl !== undefined && existing.metaImageUrl) {
        try {
          await File.remove(existing.metaImageUrl)
        } catch {}
      }

      const updated: DomainSettings = {
        ...existing,
        ...(input.faviconUrl !== undefined && { faviconUrl: input.faviconUrl }),
        ...(input.faviconType !== undefined && { faviconType: input.faviconType }),
        ...(input.customCode !== undefined && { customCode: input.customCode }),
        ...(input.metaTitle !== undefined && { metaTitle: input.metaTitle }),
        ...(input.metaDescription !== undefined && { metaDescription: input.metaDescription }),
        ...(input.metaImageUrl !== undefined && { metaImageUrl: input.metaImageUrl }),
      }

      await Database.use((tx) =>
        tx
          .update(DomainTable)
          .set({ settings: updated })
          .where(and(eq(DomainTable.workspaceId, Actor.workspaceId()), eq(DomainTable.id, input.domainId))),
      )
    },
  )
}
