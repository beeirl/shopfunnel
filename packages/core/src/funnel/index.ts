import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { groupBy, map, pipe, values } from 'remeda'
import { ulid } from 'ulid'
import z from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { DomainTable } from '../domain/index.sql'
import { File } from '../file'
import { Identifier } from '../identifier'
import { Question } from '../question'
import { fn } from '../utils/fn'
import { FunnelFileTable, FunnelTable, FunnelVersionTable } from './index.sql'
import { Info, Page, Rule, Variables, type Theme } from './types'

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
        .leftJoin(DomainTable, eq(DomainTable.workspaceId, FunnelTable.workspaceId))
        .where(
          and(eq(FunnelTable.workspaceId, Actor.workspace()), eq(FunnelTable.id, id), isNull(FunnelTable.archivedAt)),
        )
        .then((rows) => serializeVersion(rows)[0]),
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
        .leftJoin(DomainTable, eq(DomainTable.workspaceId, FunnelTable.workspaceId))
        .where(
          and(isShortId ? eq(FunnelTable.shortId, input) : eq(FunnelTable.id, input), isNull(FunnelTable.archivedAt)),
        )
        .then((rows) => serializeVersion(rows)[0]),
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
        .leftJoin(DomainTable, eq(DomainTable.workspaceId, FunnelTable.workspaceId))
        .where(and(eq(FunnelTable.workspaceId, Actor.workspace()), isNull(FunnelTable.archivedAt)))
        .orderBy(desc(FunnelTable.updatedAt))
        .then((rows) => rows.map(serialize)),
    ),
  )

  export const create = async () => {
    const id = Identifier.create('funnel')
    const shortId = id.slice(-8)
    const currentVersion = 1

    await Database.use(async (tx) => {
      await tx.insert(FunnelTable).values({
        id,
        workspaceId: Actor.workspace(),
        shortId,
        title: 'New funnel',
        settings: {},
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
    })

    return id
  }

  export const duplicate = fn(
    z.object({
      id: Identifier.schema('funnel'),
      title: z.string().optional(),
    }),
    async (input) => {
      await Database.use(async (tx) => {
        const funnelToDuplicate = await Funnel.getCurrentVersion(input.id)
        if (!funnelToDuplicate) throw new Error('Funnel not found')

        const id = Identifier.create('funnel')
        const shortId = id.slice(-8)
        const title = input.title || `${funnelToDuplicate.title} copy`

        await tx.insert(FunnelTable).values({
          id,
          workspaceId: Actor.workspace(),
          shortId,
          title,
          settings: funnelToDuplicate.settings,
          currentVersion: 1,
        })

        await tx.insert(FunnelVersionTable).values({
          funnelId: id,
          workspaceId: Actor.workspace(),
          version: 1,
          pages: funnelToDuplicate.pages,
          rules: funnelToDuplicate.rules,
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
      })
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
        metaPixelId: z
          .string()
          .regex(/^\d{10,20}$/, 'Meta Pixel ID must be a 10-20 digit number')
          .optional(),
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
      pages: z.custom<Page[]>().optional(),
      rules: z.custom<Rule[]>().optional(),
      variables: z.custom<Variables>().optional(),
      theme: z.custom<Theme>().optional(),
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

  export const unpublish = fn(Identifier.schema('funnel'), async (id) => {
    await Database.use(async (tx) => {
      await tx
        .update(FunnelTable)
        .set({
          publishedVersion: null,
          publishedAt: null,
        })
        .where(and(eq(FunnelTable.workspaceId, Actor.workspace()), eq(FunnelTable.id, id)))
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

  function serialize(row: { funnel: typeof FunnelTable.$inferSelect; domain: typeof DomainTable.$inferSelect | null }) {
    return {
      id: row.funnel.id,
      shortId: row.funnel.shortId,
      title: row.funnel.title,
      published: row.funnel.currentVersion === row.funnel.publishedVersion,
      url: url(row.funnel.shortId, row.domain?.hostname),
      createdAt: row.funnel.createdAt,
      updatedAt: row.funnel.updatedAt,
      publishedAt: row.funnel.publishedAt,
    }
  }

  function serializeVersion(
    rows: {
      funnel: typeof FunnelTable.$inferSelect
      funnel_version: typeof FunnelVersionTable.$inferSelect
      domain: typeof DomainTable.$inferSelect | null
    }[],
  ) {
    return pipe(
      rows,
      groupBy((row) => row.funnel.id),
      values(),
      map(
        (group): Info => ({
          id: group[0].funnel.id,
          workspaceId: group[0].funnel.workspaceId,
          shortId: group[0].funnel.shortId,
          title: group[0].funnel.title,
          version: group[0].funnel_version.version,
          pages: group[0].funnel_version.pages,
          rules: group[0].funnel_version.rules,
          variables: group[0].funnel_version.variables,
          theme: group[0].funnel_version.theme,
          settings: group[0].funnel.settings,
          published: group[0].funnel.publishedVersion !== null,
          draft: group[0].funnel.currentVersion !== group[0].funnel.publishedVersion,
          url: url(group[0].funnel.shortId, group[0].domain?.hostname),
          createdAt: group[0].funnel.createdAt,
          publishedAt: group[0].funnel.publishedAt,
        }),
      ),
    )
  }

  function url(shortId: string, hostname?: string) {
    if (process.env.DEV === 'true') return `http://localhost:3000/f/${shortId}`
    return `https://${hostname ?? process.env.WEB_DOMAIN}/f/${shortId}`
  }
}
