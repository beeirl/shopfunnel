import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import z from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { Domain } from '../domain/index'
import { DomainTable } from '../domain/index.sql'
import { FunnelTable } from '../funnel/index.sql'
import { Identifier } from '../identifier'
import { fn } from '../utils/fn'
import { CampaignFunnelTable, CampaignTable } from './index.sql'

export namespace Campaign {
  export const list = fn(z.void(), () =>
    Database.use((tx) =>
      tx
        .select({
          id: CampaignTable.id,
          shortId: CampaignTable.shortId,
          name: CampaignTable.name,
          defaultFunnelId: CampaignTable.defaultFunnelId,
          domainHostname: DomainTable.hostname,
          createdAt: CampaignTable.createdAt,
          updatedAt: CampaignTable.updatedAt,
        })
        .from(CampaignTable)
        .leftJoin(
          DomainTable,
          and(eq(DomainTable.workspaceId, CampaignTable.workspaceId), eq(DomainTable.id, CampaignTable.domainId)),
        )
        .where(and(eq(CampaignTable.workspaceId, Actor.workspace()), isNull(CampaignTable.archivedAt)))
        .orderBy(desc(CampaignTable.updatedAt))
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            shortId: row.shortId,
            name: row.name,
            defaultFunnelId: row.defaultFunnelId,
            url: getUrl(row.shortId, row.domainHostname ?? undefined),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })),
        ),
    ),
  )

  export const create = fn(
    z.object({
      name: z.string().min(1).max(255),
    }),
    async (input) => {
      const id = Identifier.create('campaign')
      const shortId = id.slice(-8)
      const domain = await Domain.get()

      await Database.use((tx) =>
        tx.insert(CampaignTable).values({
          id,
          workspaceId: Actor.workspace(),
          shortId,
          name: input.name,
          domainId: domain?.id,
        }),
      )

      return id
    },
  )

  export const listFunnels = fn(Identifier.schema('campaign'), async (campaignId) => {
    return Database.use(async (tx) => {
      return tx
        .select({
          funnelId: FunnelTable.id,
          funnelTitle: FunnelTable.title,
        })
        .from(CampaignFunnelTable)
        .innerJoin(
          FunnelTable,
          and(
            eq(FunnelTable.workspaceId, CampaignFunnelTable.workspaceId),
            eq(FunnelTable.id, CampaignFunnelTable.funnelId),
            isNull(FunnelTable.archivedAt),
          ),
        )
        .where(
          and(eq(CampaignFunnelTable.workspaceId, Actor.workspace()), eq(CampaignFunnelTable.campaignId, campaignId)),
        )
        .orderBy(FunnelTable.title)
    })
  })

  export const updateName = fn(
    z.object({
      id: Identifier.schema('campaign'),
      name: z.string().min(1).max(255),
    }),
    async (input) => {
      await Database.use((tx) =>
        tx
          .update(CampaignTable)
          .set({ name: input.name })
          .where(and(eq(CampaignTable.workspaceId, Actor.workspace()), eq(CampaignTable.id, input.id))),
      )
    },
  )

  export const remove = fn(Identifier.schema('campaign'), async (id) => {
    await Database.use((tx) =>
      tx
        .update(CampaignTable)
        .set({ archivedAt: sql`NOW(3)` })
        .where(and(eq(CampaignTable.workspaceId, Actor.workspace()), eq(CampaignTable.id, id))),
    )
  })

  export const setDefaultFunnel = fn(
    z.object({
      id: Identifier.schema('campaign'),
      funnelId: Identifier.schema('funnel'),
    }),
    async (input) => {
      await Database.use((tx) =>
        tx
          .update(CampaignTable)
          .set({ defaultFunnelId: input.funnelId })
          .where(and(eq(CampaignTable.workspaceId, Actor.workspace()), eq(CampaignTable.id, input.id))),
      )
    },
  )

  export function getUrl(shortId: string, hostname?: string) {
    return `https://${hostname ?? process.env.WEB_DOMAIN ?? 'localhost:3000'}/c/${shortId}`
  }
}
