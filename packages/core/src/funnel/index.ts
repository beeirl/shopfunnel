import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { ulid } from 'ulid'
import z from 'zod'
import { Actor } from '../actor'
import { Billing } from '../billing/index'
import { CampaignFunnelTable, CampaignTable } from '../campaign/index.sql'
import { Database } from '../database'
import { Domain } from '../domain/index'
import { DomainTable } from '../domain/index.sql'
import { File } from '../file'
import { Identifier } from '../identifier'
import { Question } from '../question'
import { fn } from '../utils/fn'
import { WorkspaceTable } from '../workspace/index.sql'
import { FunnelClone } from './clone'
import { FunnelFileTable, FunnelTable, FunnelVersionTable } from './index.sql'
import { type Info, Page, Rule, Theme, type Variables } from './types'

export namespace Funnel {
  const NEW_VERSION_THRESHOLD = 15 * 60 * 1000

  const DEFAULT_THEME: Theme = {
    colors: {
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#0a0a0a',
    },
    radius: '0.625rem',
    style: 'soft',
  }

  export const getCurrentVersion = fn(Identifier.schema('funnel'), (id) =>
    Database.use((tx) =>
      tx
        .select()
        .from(FunnelTable)
        .innerJoin(
          FunnelVersionTable,
          and(
            eq(FunnelVersionTable.funnelId, FunnelTable.id),
            eq(FunnelVersionTable.workspaceId, FunnelTable.workspaceId),
            eq(FunnelVersionTable.version, FunnelTable.currentVersion),
          ),
        )
        .leftJoin(DomainTable, eq(DomainTable.id, FunnelTable.domainId))
        .where(
          and(eq(FunnelTable.workspaceId, Actor.workspace()), eq(FunnelTable.id, id), isNull(FunnelTable.archivedAt)),
        )
        .then((rows) => {
          const row = rows[0]
          if (!row) return

          return {
            id: row.funnel.id,
            workspaceId: row.funnel.workspaceId,
            domainId: row.funnel.domainId,
            shortId: row.funnel.shortId,
            title: row.funnel.title,
            version: row.funnel_version.version,
            pages: row.funnel_version.pages,
            rules: row.funnel_version.rules,
            variables: row.funnel_version.variables,
            theme: row.funnel_version.theme,
            settings: { ...row.funnel.settings, ...row.domain?.settings },
            published: row.funnel.publishedVersion !== null,
            draft: row.funnel.currentVersion !== row.funnel.publishedVersion,
            url: getUrl(row.funnel.shortId, row.domain?.hostname),
            createdAt: row.funnel.createdAt,
            publishedAt: row.funnel.publishedAt,
          } satisfies Info
        }),
    ),
  )

  export const getPublishedVersion = fn(z.string(), (input) => {
    const isShortId = input.length === 8
    return Database.use((tx) =>
      tx
        .select()
        .from(FunnelTable)
        .innerJoin(
          FunnelVersionTable,
          and(
            eq(FunnelVersionTable.funnelId, FunnelTable.id),
            eq(FunnelVersionTable.workspaceId, FunnelTable.workspaceId),
            eq(FunnelVersionTable.version, FunnelTable.publishedVersion),
          ),
        )
        .innerJoin(WorkspaceTable, eq(WorkspaceTable.id, FunnelTable.workspaceId))
        .leftJoin(DomainTable, eq(DomainTable.id, FunnelTable.domainId))
        .where(
          and(
            isShortId ? eq(FunnelTable.shortId, input) : eq(FunnelTable.id, input),
            isNull(FunnelTable.archivedAt),
            isNull(WorkspaceTable.disabledAt),
          ),
        )
        .then((rows) => {
          const row = rows[0]
          if (!row) return

          return {
            id: row.funnel.id,
            workspaceId: row.funnel.workspaceId,
            domainId: row.funnel.domainId,
            shortId: row.funnel.shortId,
            title: row.funnel.title,
            version: row.funnel_version.version,
            pages: row.funnel_version.pages,
            rules: row.funnel_version.rules,
            variables: row.funnel_version.variables,
            theme: row.funnel_version.theme,
            settings: { ...row.funnel.settings, ...row.domain?.settings },
            published: row.funnel.publishedVersion !== null,
            draft: row.funnel.currentVersion !== row.funnel.publishedVersion,
            url: getUrl(row.funnel.shortId, row.domain?.hostname),
            createdAt: row.funnel.createdAt,
            publishedAt: row.funnel.publishedAt,
          }
        }),
    )
  })

  export const getPublishedVersionNumbers = fn(Identifier.schema('funnel'), (id) =>
    Database.use((tx) =>
      tx
        .select({ version: FunnelVersionTable.version })
        .from(FunnelVersionTable)
        .where(
          and(
            eq(FunnelVersionTable.workspaceId, Actor.workspace()),
            eq(FunnelVersionTable.funnelId, id),
            isNotNull(FunnelVersionTable.publishedAt),
          ),
        )
        .orderBy(FunnelVersionTable.version)
        .then((rows) => rows.map((row) => row.version)),
    ),
  )

  export const list = fn(z.void(), () =>
    Database.use((tx) =>
      tx
        .select()
        .from(FunnelTable)
        .leftJoin(DomainTable, eq(DomainTable.id, FunnelTable.domainId))
        .leftJoin(
          CampaignFunnelTable,
          and(
            eq(CampaignFunnelTable.workspaceId, FunnelTable.workspaceId),
            eq(CampaignFunnelTable.funnelId, FunnelTable.id),
          ),
        )
        .leftJoin(
          CampaignTable,
          and(
            eq(CampaignTable.workspaceId, CampaignFunnelTable.workspaceId),
            eq(CampaignTable.id, CampaignFunnelTable.campaignId),
            isNull(CampaignTable.archivedAt),
          ),
        )
        .where(and(eq(FunnelTable.workspaceId, Actor.workspace()), isNull(FunnelTable.archivedAt)))
        .orderBy(desc(FunnelTable.updatedAt))
        .then((rows) => rows.map(serialize)),
    ),
  )

  export const create = fn(
    z.object({
      title: z.string().min(1).max(255),
      campaignId: Identifier.schema('campaign'),
    }),
    async (input) => {
      const id = Identifier.create('funnel')
      const shortId = id.slice(-8)
      const currentVersion = 1
      const domain = await Domain.get()

      await Database.use(async (tx) => {
        await tx.insert(FunnelTable).values({
          id,
          workspaceId: Actor.workspace(),
          shortId,
          title: input.title,
          domainId: domain?.id,
          currentVersion,
        })

        await tx.insert(FunnelVersionTable).values({
          workspaceId: Actor.workspace(),
          funnelId: id,
          version: currentVersion,
          pages: [
            {
              id: ulid(),
              name: 'Page 1',
              blocks: [],
              properties: {
                buttonText: 'Continue',
              },
            },
          ],
          rules: [],
          variables: {},
          theme: DEFAULT_THEME,
        })

        await Funnel.setCampaign({
          campaignId: input.campaignId,
          funnelId: id,
        })
      })

      return id
    },
  )

  export const duplicate = fn(
    z.object({
      id: Identifier.schema('funnel'),
      title: z.string().optional(),
      campaignId: Identifier.schema('campaign').optional(),
    }),
    async (input) => {
      const id = Identifier.create('funnel')

      await Database.use(async (tx) => {
        const funnelToDuplicate = await Funnel.getCurrentVersion(input.id)
        if (!funnelToDuplicate) throw new Error('Funnel not found')

        const shortId = id.slice(-8)
        const title = input.title || `${funnelToDuplicate.title} copy`

        const domain = await Domain.get()
        await tx.insert(FunnelTable).values({
          id,
          workspaceId: Actor.workspace(),
          shortId,
          title,
          domainId: domain?.id,
          currentVersion: 1,
        })

        const { pages, rules } = FunnelClone.clone({
          pages: funnelToDuplicate.pages,
          rules: funnelToDuplicate.rules,
        })

        await tx.insert(FunnelVersionTable).values({
          funnelId: id,
          workspaceId: Actor.workspace(),
          version: 1,
          pages,
          rules,
          variables: funnelToDuplicate.variables,
          theme: funnelToDuplicate.theme,
        })

        const files = await tx
          .select()
          .from(FunnelFileTable)
          .where(and(eq(FunnelFileTable.workspaceId, Actor.workspace()), eq(FunnelFileTable.funnelId, input.id)))

        if (files.length > 0) {
          await tx.insert(FunnelFileTable).values(
            files.map((f) => ({
              funnelId: id,
              workspaceId: Actor.workspace(),
              fileId: f.fileId,
            })),
          )
        }

        if (input.campaignId) {
          await Funnel.setCampaign({
            campaignId: input.campaignId,
            funnelId: id,
          })
        }
      })

      return id
    },
  )

  export const createFile = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      contentType: z.string(),
      data: z.instanceof(Buffer),
      name: z.string(),
      size: z.number(),
    }),
    async (input) => {
      const file = await File.create({
        contentType: input.contentType,
        data: input.data,
        name: input.name,
        size: input.size,
        cacheControl: 'public, max-age=31536000, immutable',
      })
      await Database.use((tx) =>
        tx.insert(FunnelFileTable).values({
          workspaceId: Actor.workspace(),
          funnelId: input.funnelId,
          fileId: file.id,
        }),
      )
      return file
    },
  )

  export const updateTitle = fn(
    z.object({
      id: Identifier.schema('funnel'),
      title: z.string().min(1).max(255),
    }),
    async (input) => {
      await Database.use((tx) =>
        tx
          .update(FunnelTable)
          .set({ title: input.title })
          .where(and(eq(FunnelTable.workspaceId, Actor.workspace()), eq(FunnelTable.id, input.id))),
      )
    },
  )

  export const updateSettings = fn(
    z.object({
      id: Identifier.schema('funnel'),
      settings: z.object({
        privacyUrl: z.url().optional().or(z.literal('')),
        termsUrl: z.url().optional().or(z.literal('')),
      }),
    }),
    async (input) => {
      await Database.use((tx) =>
        tx
          .update(FunnelTable)
          .set({ settings: input.settings })
          .where(and(eq(FunnelTable.workspaceId, Actor.workspace()), eq(FunnelTable.id, input.id))),
      )
    },
  )

  export const update = fn(
    z.object({
      id: Identifier.schema('funnel'),
      pages: z.array(Page).optional(),
      rules: z.array(Rule).optional(),
      variables: z.custom<Variables>().optional(),
      theme: Theme.optional(),
    }),
    async (input) => {
      await Database.use(async (tx) => {
        const funnel = await tx
          .select({
            currentVersion: FunnelTable.currentVersion,
            publishedVersion: FunnelTable.publishedVersion,
          })
          .from(FunnelTable)
          .where(and(eq(FunnelTable.id, input.id), eq(FunnelTable.workspaceId, Actor.workspace())))
          .then((rows) => rows[0])
        if (!funnel) return

        const currentVersion = await tx
          .select()
          .from(FunnelVersionTable)
          .where(
            and(
              eq(FunnelVersionTable.workspaceId, Actor.workspace()),
              eq(FunnelVersionTable.funnelId, input.id),
              eq(FunnelVersionTable.version, funnel.currentVersion),
            ),
          )
          .then((rows) => rows[0])
        if (!currentVersion) return

        const published = funnel.currentVersion === funnel.publishedVersion
        const timeSinceUpdate = Date.now() - currentVersion.updatedAt.getTime()
        const needsNewVersion = published || timeSinceUpdate > NEW_VERSION_THRESHOLD

        if (needsNewVersion) {
          const newVersion = currentVersion.version + 1

          await tx.insert(FunnelVersionTable).values({
            workspaceId: Actor.workspace(),
            funnelId: input.id,
            version: newVersion,
            pages: input.pages ?? currentVersion.pages,
            rules: input.rules ?? currentVersion.rules,
            variables: input.variables ?? currentVersion.variables,
            theme: input.theme ?? currentVersion.theme,
          })

          await tx
            .update(FunnelTable)
            .set({ currentVersion: newVersion })
            .where(and(eq(FunnelTable.workspaceId, Actor.workspace()), eq(FunnelTable.id, input.id)))
        } else {
          await tx
            .update(FunnelVersionTable)
            .set({
              pages: input.pages,
              rules: input.rules,
              variables: input.variables,
              theme: input.theme,
            })
            .where(
              and(
                eq(FunnelVersionTable.workspaceId, Actor.workspace()),
                eq(FunnelVersionTable.funnelId, input.id),
                eq(FunnelVersionTable.version, funnel.currentVersion),
              ),
            )
        }
      })
    },
  )

  export const publish = fn(Identifier.schema('funnel'), async (id) => {
    await Billing.assert()
    await Database.use(async (tx) => {
      const funnel = await tx
        .select()
        .from(FunnelTable)
        .where(and(eq(FunnelTable.workspaceId, Actor.workspace()), eq(FunnelTable.id, id)))
        .then((rows) => rows[0])
      if (!funnel) return
      if (funnel.currentVersion === funnel.publishedVersion) return

      await tx
        .update(FunnelVersionTable)
        .set({ publishedAt: sql`NOW(3)` })
        .where(
          and(
            eq(FunnelVersionTable.workspaceId, Actor.workspace()),
            eq(FunnelVersionTable.funnelId, id),
            eq(FunnelVersionTable.version, funnel.currentVersion),
          ),
        )

      await tx
        .update(FunnelTable)
        .set({
          publishedVersion: funnel.currentVersion,
          publishedAt: sql`NOW(3)`,
        })
        .where(and(eq(FunnelTable.workspaceId, Actor.workspace()), eq(FunnelTable.id, id)))
    })

    await Question.sync({ funnelId: id })
  })

  export const unpublishAll = fn(z.void(), async () => {
    await Database.use(async (tx) => {
      await tx
        .update(FunnelTable)
        .set({
          publishedVersion: null,
          publishedAt: null,
        })
        .where(
          and(
            eq(FunnelTable.workspaceId, Actor.workspace()),
            isNull(FunnelTable.archivedAt),
            isNotNull(FunnelTable.publishedVersion),
          ),
        )
    })
  })

  export const remove = fn(Identifier.schema('funnel'), async (id) => {
    await Database.use(async (tx) => {
      await tx
        .update(FunnelTable)
        .set({
          archivedAt: sql`NOW(3)`,
          publishedVersion: null,
          publishedAt: null,
        })
        .where(and(eq(FunnelTable.workspaceId, Actor.workspace()), eq(FunnelTable.id, id)))
    })
  })

  export const setCampaign = fn(
    z.object({
      campaignId: Identifier.schema('campaign'),
      funnelId: Identifier.schema('funnel'),
    }),
    async (input) => {
      await Database.use(async (tx) => {
        const campaign = await tx
          .select({ defaultFunnelId: CampaignTable.defaultFunnelId })
          .from(CampaignTable)
          .where(
            and(
              eq(CampaignTable.workspaceId, Actor.workspace()),
              eq(CampaignTable.id, input.campaignId),
              isNull(CampaignTable.archivedAt),
            ),
          )
          .then((rows) => rows[0])
        if (!campaign) throw new Error('Campaign not found')

        await tx.insert(CampaignFunnelTable).values({
          workspaceId: Actor.workspace(),
          campaignId: input.campaignId,
          funnelId: input.funnelId,
        })

        if (!campaign.defaultFunnelId) {
          await tx
            .update(CampaignTable)
            .set({ defaultFunnelId: input.funnelId })
            .where(and(eq(CampaignTable.workspaceId, Actor.workspace()), eq(CampaignTable.id, input.campaignId)))
        }
      })
    },
  )

  function serialize(row: {
    funnel: typeof FunnelTable.$inferSelect
    domain: typeof DomainTable.$inferSelect | null
    campaign: typeof CampaignTable.$inferSelect | null
  }) {
    return {
      id: row.funnel.id,
      shortId: row.funnel.shortId,
      title: row.funnel.title,
      published: row.funnel.currentVersion === row.funnel.publishedVersion,
      url: getUrl(row.funnel.shortId, row.domain?.hostname),
      campaign: row.campaign ? { id: row.campaign.id, name: row.campaign.name } : null,
      createdAt: row.funnel.createdAt,
      updatedAt: row.funnel.updatedAt,
      publishedAt: row.funnel.publishedAt,
    }
  }

  export function getUrl(shortId: string, hostname?: string) {
    return `https://${hostname ?? process.env.WEB_DOMAIN ?? 'localhost:3000'}/p/${shortId}`
  }
}
