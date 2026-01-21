import { Resource } from '@shopfunnel/resource'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { fn } from '../utils/fn'
import { DomainTable } from './index.sql'

export namespace Domain {
  export const fromId = fn(Identifier.schema('domain'), async (id) =>
    Database.use((tx) =>
      tx
        .select()
        .from(DomainTable)
        .where(and(eq(DomainTable.id, id), isNull(DomainTable.archivedAt)))
        .then((rows) => rows[0]),
    ),
  )

  export const fromHostname = fn(z.string(), async (hostname) =>
    Database.use((tx) =>
      tx
        .select()
        .from(DomainTable)
        .where(and(eq(DomainTable.hostname, hostname.toLowerCase()), isNull(DomainTable.archivedAt)))
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

  export const upsert = fn(
    z.object({
      hostname: z.string(),
    }),
    async (input) => {
      const hostname = input.hostname.toLowerCase()

      const existingDomain = await Database.use((tx) =>
        tx
          .select()
          .from(DomainTable)
          .where(and(eq(DomainTable.workspaceId, Actor.workspaceId()), isNull(DomainTable.archivedAt)))
          .then((rows) => rows[0]),
      )

      // If same hostname already exists, no-op - return existing domain id
      if (existingDomain && existingDomain.hostname === hostname) {
        return existingDomain.id
      }

      // If different hostname exists, archive the old one first
      if (existingDomain) {
        if (existingDomain.cloudflareHostnameId) {
          const deleteResponse = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${Resource.CLOUDFLARE_ZONE_ID.value}/custom_hostnames/${existingDomain.cloudflareHostnameId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${Resource.CLOUDFLARE_API_TOKEN.value}`,
              },
            },
          )
          const deleteJson = (await deleteResponse.json()) as any
          if (!deleteJson.success && deleteJson.errors?.[0]?.code !== 1410) {
            const errorMessage =
              deleteJson.errors?.[0]?.message || 'Failed to delete old custom hostname from Cloudflare'
            throw new Error(errorMessage)
          }
        }

        await Database.use((tx) =>
          tx
            .delete(DomainTable)
            .where(and(eq(DomainTable.workspaceId, Actor.workspaceId()), eq(DomainTable.id, existingDomain.id))),
        )
      }

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

      await Database.use((tx) =>
        tx.insert(DomainTable).values({
          id,
          workspaceId: Actor.workspaceId(),
          hostname,
          cloudflareHostnameId,
        }),
      )

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
}
