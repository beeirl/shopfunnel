import { and, desc, eq, getTableColumns, isNotNull, isNull, sql } from 'drizzle-orm'
import { ulid } from 'ulid'
import z from 'zod'
import { Actor } from '../actor'
import { Billing } from '../billing/index'
import { Database } from '../database'
import { Domain } from '../domain/index'
import { DomainTable } from '../domain/index.sql'
import { File } from '../file'
import { Identifier } from '../identifier'
import { Question } from '../question'
import { fn } from '../utils/fn'
import { FunnelClone } from './clone'
import {
  FunnelExperimentAlreadyActiveError,
  FunnelExperimentAlreadyEndedError,
  FunnelExperimentAlreadyStartedError,
  FunnelExperimentInvalidWeightsError,
  FunnelExperimentNoVariantsError,
  FunnelExperimentNotStartedError,
  FunnelExperimentVariantInvalidError,
  FunnelExperimentVariantNotPublishedError,
  FunnelExperimentWinnerAlreadySelectedError,
} from './error'
import {
  FunnelExperimentTable,
  FunnelExperimentVariantTable,
  FunnelFileTable,
  FunnelTable,
  FunnelVariantDraftTable,
  FunnelVariantTable,
  FunnelVariantVersionTable,
} from './index.sql'
import { type Info, Page, Rule, Theme, type Variables } from './types'

export namespace Funnel {
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

  const DEFAULT_PAGES = () => [
    {
      id: ulid(),
      name: 'Page 1',
      blocks: [],
      properties: {
        buttonText: 'Continue',
      },
    },
  ]

  export const get = fn(
    z.object({
      funnelShortId: z.string().length(8),
      funnelVariantId: Identifier.schema('funnel_variant').optional(),
    }),
    async (input) => {
      const rows = await Database.use((tx) =>
        tx
          .select({
            ...getTableColumns(FunnelTable),
            domain: DomainTable,
            experimentVariant: {
              id: FunnelExperimentVariantTable.funnelVariantId,
              weight: FunnelExperimentVariantTable.weight,
            },
          })
          .from(FunnelTable)
          .leftJoin(DomainTable, eq(DomainTable.id, FunnelTable.domainId))
          .leftJoin(
            FunnelExperimentTable,
            and(
              eq(FunnelExperimentTable.workspaceId, FunnelTable.workspaceId),
              eq(FunnelExperimentTable.funnelId, FunnelTable.id),
              isNotNull(FunnelExperimentTable.startedAt),
              isNull(FunnelExperimentTable.endedAt),
            ),
          )
          .leftJoin(
            FunnelExperimentVariantTable,
            and(
              eq(FunnelExperimentVariantTable.workspaceId, FunnelExperimentTable.workspaceId),
              eq(FunnelExperimentVariantTable.funnelExperimentId, FunnelExperimentTable.id),
            ),
          )
          .where(and(eq(FunnelTable.shortId, input.funnelShortId), isNull(FunnelTable.archivedAt))),
      )
      if (rows.length === 0) return

      const funnel = rows[0]!

      const variantId = (() => {
        if (input.funnelVariantId) return input.funnelVariantId

        const activeExperimentVariants = rows
          .filter((r) => r.experimentVariant !== null && r.experimentVariant.weight > 0)
          .map((r) => r.experimentVariant!)

        if (activeExperimentVariants.length > 0) {
          const totalWeight = activeExperimentVariants.reduce((sum, v) => sum + v.weight, 0)
          const rand = Math.random() * totalWeight
          let cumulative = 0
          for (const v of activeExperimentVariants) {
            cumulative += v.weight
            if (rand < cumulative) return v.id
          }
          return activeExperimentVariants[activeExperimentVariants.length - 1]!.id
        }

        return funnel.mainVariantId ?? undefined
      })()
      if (!variantId) return

      const variantVersion = await Database.use((tx) =>
        tx
          .select({
            number: FunnelVariantVersionTable.number,
            pages: FunnelVariantVersionTable.pages,
            rules: FunnelVariantVersionTable.rules,
            variables: FunnelVariantVersionTable.variables,
            theme: FunnelVariantVersionTable.theme,
          })
          .from(FunnelVariantTable)
          .innerJoin(
            FunnelVariantVersionTable,
            and(
              eq(FunnelVariantVersionTable.workspaceId, FunnelVariantTable.workspaceId),
              eq(FunnelVariantVersionTable.funnelId, FunnelVariantTable.funnelId),
              eq(FunnelVariantVersionTable.funnelVariantId, FunnelVariantTable.id),
              eq(FunnelVariantVersionTable.number, FunnelVariantTable.publishedVersion),
            ),
          )
          .where(
            and(
              eq(FunnelVariantTable.workspaceId, funnel.workspaceId),
              eq(FunnelVariantTable.funnelId, funnel.id),
              eq(FunnelVariantTable.id, variantId),
            ),
          )
          .then((rows) => rows[0]),
      )
      if (!variantVersion) return

      return {
        id: funnel.id,
        workspaceId: funnel.workspaceId,
        shortId: funnel.shortId,
        variantId,
        variantVersion: variantVersion.number,
        title: funnel.title,
        pages: variantVersion.pages,
        rules: variantVersion.rules,
        variables: variantVersion.variables,
        theme: variantVersion.theme,
        settings: { ...funnel.settings, ...funnel.domain?.settings },
        url: getUrl({ shortId: funnel.shortId, hostname: funnel.domain?.hostname }),
      } satisfies Info
    },
  )

  export const getVariantDraft = fn(
    z.object({
      id: Identifier.schema('funnel'),
      variantId: Identifier.schema('funnel_variant').optional(),
    }),
    async (input) => {
      const result = await Database.use((tx) =>
        tx
          .select({
            ...getTableColumns(FunnelTable),
            domain: DomainTable,
            variant: getTableColumns(FunnelVariantTable),
            draft: getTableColumns(FunnelVariantDraftTable),
            publishedAt: FunnelVariantVersionTable.createdAt,
          })
          .from(FunnelTable)
          .leftJoin(DomainTable, eq(DomainTable.id, FunnelTable.domainId))
          .innerJoin(
            FunnelVariantTable,
            and(
              eq(FunnelVariantTable.workspaceId, FunnelTable.workspaceId),
              eq(FunnelVariantTable.funnelId, FunnelTable.id),
              input.variantId
                ? eq(FunnelVariantTable.id, input.variantId)
                : eq(FunnelVariantTable.id, FunnelTable.mainVariantId),
              isNull(FunnelVariantTable.archivedAt),
            ),
          )
          .innerJoin(
            FunnelVariantDraftTable,
            and(
              eq(FunnelVariantDraftTable.workspaceId, FunnelVariantTable.workspaceId),
              eq(FunnelVariantDraftTable.funnelId, FunnelVariantTable.funnelId),
              eq(FunnelVariantDraftTable.funnelVariantId, FunnelVariantTable.id),
            ),
          )
          .leftJoin(
            FunnelVariantVersionTable,
            and(
              eq(FunnelVariantVersionTable.workspaceId, FunnelVariantTable.workspaceId),
              eq(FunnelVariantVersionTable.funnelId, FunnelVariantTable.funnelId),
              eq(FunnelVariantVersionTable.funnelVariantId, FunnelVariantTable.id),
              eq(FunnelVariantVersionTable.number, FunnelVariantTable.publishedVersion),
            ),
          )
          .where(
            and(
              eq(FunnelTable.workspaceId, Actor.workspaceId()),
              eq(FunnelTable.id, input.id),
              isNull(FunnelTable.archivedAt),
            ),
          )
          .then((rows) => rows[0]),
      )
      if (!result) return

      return {
        id: result.id,
        workspaceId: result.workspaceId,
        shortId: result.shortId,
        variantId: result.variant.id,
        url: getUrl({ shortId: result.shortId, hostname: result.domain?.hostname }),
        title: result.title,
        variantTitle: result.variant.title,
        pages: result.draft.pages,
        rules: result.draft.rules,
        variables: result.draft.variables,
        theme: result.draft.theme,
        canPublish:
          result.publishedAt === null || (result.draft.editedAt !== null && result.draft.editedAt > result.publishedAt),
        settings: { ...result.settings, ...result.domain?.settings },
        createdAt: result.createdAt,
      }
    },
  )

  export const list = fn(z.void(), () =>
    Database.use((tx) =>
      tx
        .select()
        .from(FunnelTable)
        .leftJoin(DomainTable, eq(DomainTable.id, FunnelTable.domainId))
        .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), isNull(FunnelTable.archivedAt)))
        .orderBy(desc(FunnelTable.updatedAt))
        .then((rows) =>
          rows.map((row) => ({
            id: row.funnel.id,
            shortId: row.funnel.shortId,
            title: row.funnel.title,
            url: getUrl({ shortId: row.funnel.shortId, hostname: row.domain?.hostname }),
            createdAt: row.funnel.createdAt,
            updatedAt: row.funnel.updatedAt,
          })),
        ),
    ),
  )

  export const create = fn(z.void(), async () => {
    const id = Identifier.create('funnel')
    const mainVariantId = Identifier.create('funnel_variant')
    const domain = await Domain.get()

    const pages = DEFAULT_PAGES()

    await Database.transaction(async (tx) => {
      await tx.insert(FunnelTable).values({
        id,
        workspaceId: Actor.workspaceId(),
        shortId: id.slice(-8),
        title: 'New funnel',
        domainId: domain?.id,
        mainVariantId,
      })

      await tx.insert(FunnelVariantTable).values({
        id: mainVariantId,
        workspaceId: Actor.workspaceId(),
        funnelId: id,
        title: 'Main',
      })

      await tx.insert(FunnelVariantDraftTable).values({
        id: Identifier.create('funnel_variant_draft'),
        workspaceId: Actor.workspaceId(),
        funnelId: id,
        funnelVariantId: mainVariantId,
        pages,
        rules: [],
        variables: {},
        theme: DEFAULT_THEME,
      })
    })

    return id
  })

  export const update = fn(
    z.object({
      funnelVariantId: Identifier.schema('funnel_variant'),
      pages: z.array(Page).optional(),
      rules: z.array(Rule).optional(),
      variables: z.custom<Variables>().optional(),
      theme: Theme.optional(),
    }),
    async (input) => {
      await Database.use((tx) =>
        tx
          .update(FunnelVariantDraftTable)
          .set({
            ...(input.pages && { pages: input.pages }),
            ...(input.rules && { rules: input.rules }),
            ...(input.variables && { variables: input.variables }),
            ...(input.theme && { theme: input.theme }),
            editedAt: sql`NOW(3)`,
          })
          .where(
            and(
              eq(FunnelVariantDraftTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantDraftTable.funnelVariantId, input.funnelVariantId),
            ),
          ),
      )
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
          .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, input.id))),
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
          .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, input.id))),
      )
    },
  )

  export const updateVariantName = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant'),
      title: z.string().min(1).max(255),
    }),
    async (input) => {
      await Database.use((tx) =>
        tx
          .update(FunnelVariantTable)
          .set({ title: input.title })
          .where(
            and(
              eq(FunnelVariantTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantTable.funnelId, input.funnelId),
              eq(FunnelVariantTable.id, input.funnelVariantId),
            ),
          ),
      )
    },
  )

  export const duplicate = fn(
    z.object({
      id: Identifier.schema('funnel'),
      title: z.string().optional(),
    }),
    async (input) => {
      const newId = Identifier.create('funnel')
      const shortId = newId.slice(-8)
      const variantId = Identifier.create('funnel_variant')

      const sourceFunnel = await Database.use((tx) =>
        tx
          .select({
            title: FunnelTable.title,
          })
          .from(FunnelTable)
          .where(
            and(
              eq(FunnelTable.workspaceId, Actor.workspaceId()),
              eq(FunnelTable.id, input.id),
              isNull(FunnelTable.archivedAt),
            ),
          )
          .then((rows) => rows[0]),
      )
      if (!sourceFunnel) throw new Error('Funnel not found')

      const sourceDraft = await Database.use((tx) =>
        tx
          .select({
            pages: FunnelVariantDraftTable.pages,
            rules: FunnelVariantDraftTable.rules,
            variables: FunnelVariantDraftTable.variables,
            theme: FunnelVariantDraftTable.theme,
          })
          .from(FunnelVariantDraftTable)
          .innerJoin(
            FunnelVariantTable,
            and(
              eq(FunnelVariantTable.workspaceId, FunnelVariantDraftTable.workspaceId),
              eq(FunnelVariantTable.funnelId, FunnelVariantDraftTable.funnelId),
              eq(FunnelVariantTable.id, FunnelVariantDraftTable.funnelVariantId),
              isNull(FunnelVariantTable.archivedAt),
            ),
          )
          .where(
            and(
              eq(FunnelVariantDraftTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantDraftTable.funnelId, input.id),
            ),
          )
          .orderBy(desc(FunnelVariantTable.updatedAt))
          .limit(1)
          .then((rows) => rows[0]),
      )
      if (!sourceDraft) throw new Error('Funnel draft not found')

      const title = input.title || `${sourceFunnel.title} copy`
      const domain = await Domain.get()

      await Database.use((tx) =>
        tx.insert(FunnelTable).values({
          id: newId,
          workspaceId: Actor.workspaceId(),
          shortId,
          title,
          domainId: domain?.id,
          mainVariantId: variantId,
        }),
      )

      await Database.use((tx) =>
        tx.insert(FunnelVariantTable).values({
          id: variantId,
          workspaceId: Actor.workspaceId(),
          funnelId: newId,
          title: 'Main',
        }),
      )

      const { pages, rules } = FunnelClone.clone({ pages: sourceDraft.pages, rules: sourceDraft.rules })

      await Database.use((tx) =>
        tx.insert(FunnelVariantDraftTable).values({
          id: Identifier.create('funnel_variant_draft'),
          workspaceId: Actor.workspaceId(),
          funnelId: newId,
          funnelVariantId: variantId,
          pages,
          rules,
          variables: sourceDraft.variables,
          theme: sourceDraft.theme,
        }),
      )

      const files = await Database.use((tx) =>
        tx
          .select()
          .from(FunnelFileTable)
          .where(and(eq(FunnelFileTable.workspaceId, Actor.workspaceId()), eq(FunnelFileTable.funnelId, input.id))),
      )

      if (files.length > 0) {
        await Database.use((tx) =>
          tx.insert(FunnelFileTable).values(
            files.map((f) => ({
              funnelId: newId,
              workspaceId: Actor.workspaceId(),
              fileId: f.fileId,
            })),
          ),
        )
      }

      return newId
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
          workspaceId: Actor.workspaceId(),
          funnelId: input.funnelId,
          fileId: file.id,
        }),
      )
      return file
    },
  )

  export const remove = fn(Identifier.schema('funnel'), async (id) => {
    await Database.use(async (tx) => {
      await tx
        .update(FunnelTable)
        .set({
          archivedAt: sql`NOW(3)`,
          mainVariantId: null,
        })
        .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, id)))
    })
  })

  export const deactivateAll = fn(z.void(), async () => {
    await Database.use(async (tx) => {
      await tx.update(FunnelTable).set({ mainVariantId: null }).where(eq(FunnelTable.workspaceId, Actor.workspaceId()))
    })
  })

  export const listVariants = fn(Identifier.schema('funnel'), async (funnelId) => {
    const rows = await Database.use((tx) =>
      tx
        .select({
          ...getTableColumns(FunnelVariantTable),
          mainVariantId: FunnelTable.mainVariantId,
          shortId: FunnelTable.shortId,
          domainHostname: DomainTable.hostname,
          experimentVariantWeight: FunnelExperimentVariantTable.weight,
        })
        .from(FunnelVariantTable)
        .innerJoin(
          FunnelTable,
          and(
            eq(FunnelTable.workspaceId, FunnelVariantTable.workspaceId),
            eq(FunnelTable.id, FunnelVariantTable.funnelId),
          ),
        )
        .leftJoin(DomainTable, eq(DomainTable.id, FunnelTable.domainId))
        .leftJoin(
          FunnelExperimentTable,
          and(
            eq(FunnelExperimentTable.workspaceId, FunnelVariantTable.workspaceId),
            eq(FunnelExperimentTable.funnelId, FunnelVariantTable.funnelId),
            isNotNull(FunnelExperimentTable.startedAt),
            isNull(FunnelExperimentTable.endedAt),
          ),
        )
        .leftJoin(
          FunnelExperimentVariantTable,
          and(
            eq(FunnelExperimentVariantTable.workspaceId, FunnelExperimentTable.workspaceId),
            eq(FunnelExperimentVariantTable.funnelExperimentId, FunnelExperimentTable.id),
            eq(FunnelExperimentVariantTable.funnelVariantId, FunnelVariantTable.id),
          ),
        )
        .where(
          and(
            eq(FunnelVariantTable.workspaceId, Actor.workspaceId()),
            eq(FunnelVariantTable.funnelId, funnelId),
            isNull(FunnelVariantTable.archivedAt),
          ),
        )
        .orderBy(
          desc(sql`${FunnelVariantTable.id} = ${FunnelTable.mainVariantId}`),
          desc(FunnelVariantTable.updatedAt),
        ),
    )

    const hasExperiment = rows.some((r) => r.experimentVariantWeight !== null)

    return rows.map((row) => ({
      id: row.id,
      funnelId: row.funnelId,
      title: row.title,
      isMain: row.id === row.mainVariantId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      trafficPercentage: hasExperiment ? (row.experimentVariantWeight ?? 0) : row.id === row.mainVariantId ? 100 : 0,
      url: `${getUrl({ shortId: row.shortId, hostname: row.domainHostname ?? undefined })}?variantId=${row.id}`,
    }))
  })

  export const createVariant = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      title: z.string().min(1).max(255),
      fromId: Identifier.schema('funnel_variant'),
    }),
    (input) => {
      return Database.use(async (tx) => {
        const id = Identifier.create('funnel_variant')

        const funnel = await tx
          .select({ id: FunnelTable.id })
          .from(FunnelTable)
          .where(
            and(
              eq(FunnelTable.workspaceId, Actor.workspaceId()),
              eq(FunnelTable.id, input.funnelId),
              isNull(FunnelTable.archivedAt),
            ),
          )
          .then((rows) => rows[0])
        if (!funnel) throw new Error('Funnel not found')

        const sourceVariant = await tx
          .select({
            draft: FunnelVariantDraftTable,
          })
          .from(FunnelVariantTable)
          .innerJoin(
            FunnelVariantDraftTable,
            and(
              eq(FunnelVariantDraftTable.funnelId, FunnelVariantTable.funnelId),
              eq(FunnelVariantDraftTable.funnelVariantId, FunnelVariantTable.id),
            ),
          )
          .where(
            and(
              eq(FunnelVariantTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantTable.funnelId, input.funnelId),
              eq(FunnelVariantTable.id, input.fromId),
              isNull(FunnelVariantTable.archivedAt),
            ),
          )
          .then((rows) => rows[0])
        if (!sourceVariant) throw new Error('Source variant not found')

        await tx.insert(FunnelVariantTable).values({
          id,
          workspaceId: Actor.workspaceId(),
          funnelId: input.funnelId,
          title: input.title,
        })

        const { pages, rules } = FunnelClone.clone({
          pages: sourceVariant.draft.pages,
          rules: sourceVariant.draft.rules,
        })

        await tx.insert(FunnelVariantDraftTable).values({
          id: Identifier.create('funnel_variant_draft'),
          workspaceId: Actor.workspaceId(),
          funnelId: input.funnelId,
          funnelVariantId: id,
          pages,
          rules,
          variables: sourceVariant.draft.variables,
          theme: sourceVariant.draft.theme,
        })

        return id
      })
    },
  )

  export const setMainVariant = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant'),
    }),
    async (input) => {
      const result = await Database.use((tx) =>
        tx
          .select({
            variantId: FunnelVariantTable.id,
            publishedVersion: FunnelVariantTable.publishedVersion,
            activeExperimentId: FunnelExperimentTable.id,
          })
          .from(FunnelVariantTable)
          .leftJoin(
            FunnelExperimentTable,
            and(
              eq(FunnelExperimentTable.workspaceId, FunnelVariantTable.workspaceId),
              eq(FunnelExperimentTable.funnelId, FunnelVariantTable.funnelId),
              isNotNull(FunnelExperimentTable.startedAt),
              isNull(FunnelExperimentTable.endedAt),
            ),
          )
          .where(
            and(
              eq(FunnelVariantTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantTable.id, input.funnelVariantId),
              eq(FunnelVariantTable.funnelId, input.funnelId),
              isNull(FunnelVariantTable.archivedAt),
            ),
          )
          .then((rows) => rows[0]),
      )
      if (!result) throw new Error('Variant not found')
      if (result.activeExperimentId) throw new Error('Cannot change main variant while an experiment is active')
      if (result.publishedVersion === null) {
        throw new Error('Variant must be published before it can be set as main')
      }

      await Database.use((tx) =>
        tx
          .update(FunnelTable)
          .set({ mainVariantId: input.funnelVariantId })
          .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, input.funnelId))),
      )
    },
  )

  export const publishVariant = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant'),
    }),
    async (input) => {
      await Billing.assert()

      const funnel = await Database.use((tx) =>
        tx
          .select()
          .from(FunnelTable)
          .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, input.funnelId)))
          .then((rows) => rows[0]),
      )
      if (!funnel) return

      const draft = await Database.use((tx) =>
        tx
          .select()
          .from(FunnelVariantDraftTable)
          .where(
            and(
              eq(FunnelVariantDraftTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantDraftTable.funnelId, input.funnelId),
              eq(FunnelVariantDraftTable.funnelVariantId, input.funnelVariantId),
            ),
          )
          .then((rows) => rows[0]),
      )
      if (!draft) return

      await Database.transaction(async (tx) => {
        await tx
          .update(FunnelVariantTable)
          .set({
            publishedVersion: sql`COALESCE(${FunnelVariantTable.publishedVersion}, 0) + 1`,
          })
          .where(
            and(
              eq(FunnelVariantTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantTable.id, input.funnelVariantId),
            ),
          )

        const variant = await tx
          .select({ publishedVersion: FunnelVariantTable.publishedVersion })
          .from(FunnelVariantTable)
          .where(
            and(
              eq(FunnelVariantTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantTable.id, input.funnelVariantId),
            ),
          )
          .then((rows) => rows[0])
        if (!variant?.publishedVersion) return

        await tx.insert(FunnelVariantVersionTable).values({
          workspaceId: Actor.workspaceId(),
          funnelId: input.funnelId,
          funnelVariantId: input.funnelVariantId,
          number: variant.publishedVersion,
          pages: draft.pages,
          rules: draft.rules,
          variables: draft.variables,
          theme: draft.theme,
        })

        if (!funnel.mainVariantId) {
          await tx
            .update(FunnelTable)
            .set({ mainVariantId: input.funnelVariantId })
            .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, input.funnelId)))
        }
      })

      await Question.sync({ funnelId: input.funnelId, funnelVariantId: input.funnelVariantId })
    },
  )

  export const getExperiment = fn(Identifier.schema('funnel_experiment'), async (experimentId) => {
    return Database.use(async (tx) => {
      const experiment = await tx
        .select()
        .from(FunnelExperimentTable)
        .where(
          and(eq(FunnelExperimentTable.workspaceId, Actor.workspaceId()), eq(FunnelExperimentTable.id, experimentId)),
        )
        .then((rows) => rows[0])
      if (!experiment) return

      const experimentVariants = await tx
        .select({
          funnelVariantId: FunnelExperimentVariantTable.funnelVariantId,
          weight: FunnelExperimentVariantTable.weight,
          variantTitle: FunnelVariantTable.title,
        })
        .from(FunnelExperimentVariantTable)
        .innerJoin(
          FunnelVariantTable,
          and(
            eq(FunnelVariantTable.workspaceId, FunnelExperimentVariantTable.workspaceId),
            eq(FunnelVariantTable.id, FunnelExperimentVariantTable.funnelVariantId),
          ),
        )
        .where(
          and(
            eq(FunnelExperimentVariantTable.workspaceId, Actor.workspaceId()),
            eq(FunnelExperimentVariantTable.funnelExperimentId, experimentId),
          ),
        )

      return {
        id: experiment.id,
        funnelId: experiment.funnelId,
        name: experiment.name,
        status: experiment.endedAt
          ? ('ended' as const)
          : experiment.startedAt
            ? ('started' as const)
            : ('draft' as const),
        startedAt: experiment.startedAt,
        endedAt: experiment.endedAt,
        createdAt: experiment.createdAt,
        variants: experimentVariants.map((v) => ({
          funnelVariantId: v.funnelVariantId,
          variantTitle: v.variantTitle,
          weight: v.weight,
          isWinner: v.funnelVariantId === experiment.winnerVariantId,
        })),
      }
    })
  })

  export const listExperiments = fn(Identifier.schema('funnel'), async (funnelId) => {
    return Database.use(async (tx) => {
      const experiments = await tx
        .select()
        .from(FunnelExperimentTable)
        .where(
          and(
            eq(FunnelExperimentTable.workspaceId, Actor.workspaceId()),
            eq(FunnelExperimentTable.funnelId, funnelId),
            isNull(FunnelExperimentTable.archivedAt),
          ),
        )
        .orderBy(desc(FunnelExperimentTable.createdAt))

      return experiments.map((exp) => ({
        id: exp.id,
        funnelId: exp.funnelId,
        name: exp.name,
        status: exp.endedAt ? 'ended' : exp.startedAt ? 'started' : 'draft',
        startedAt: exp.startedAt,
        endedAt: exp.endedAt,
        createdAt: exp.createdAt,
      }))
    })
  })

  export const upsertExperiment = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      name: z.string().min(1).max(255),
      variants: z.array(
        z.object({
          funnelVariantId: Identifier.schema('funnel_variant'),
          weight: z.number().int().min(0).max(100),
        }),
      ),
      experimentId: Identifier.schema('funnel_experiment').optional(),
    }),
    async (input) => {
      return Database.use(async (tx) => {
        const funnel = await tx
          .select({ id: FunnelTable.id })
          .from(FunnelTable)
          .where(
            and(
              eq(FunnelTable.workspaceId, Actor.workspaceId()),
              eq(FunnelTable.id, input.funnelId),
              isNull(FunnelTable.archivedAt),
            ),
          )
          .then((rows) => rows[0])
        if (!funnel) throw new Error('Funnel not found')

        if (input.experimentId) {
          const experiment = await tx
            .select()
            .from(FunnelExperimentTable)
            .where(
              and(
                eq(FunnelExperimentTable.workspaceId, Actor.workspaceId()),
                eq(FunnelExperimentTable.id, input.experimentId),
              ),
            )
            .then((rows) => rows[0])
          if (!experiment) throw new Error('Experiment not found')
          if (experiment.endedAt) throw new Error('Cannot modify a completed experiment')

          await tx
            .update(FunnelExperimentTable)
            .set({ name: input.name })
            .where(
              and(
                eq(FunnelExperimentTable.workspaceId, Actor.workspaceId()),
                eq(FunnelExperimentTable.id, input.experimentId),
              ),
            )

          await tx
            .delete(FunnelExperimentVariantTable)
            .where(
              and(
                eq(FunnelExperimentVariantTable.workspaceId, Actor.workspaceId()),
                eq(FunnelExperimentVariantTable.funnelExperimentId, input.experimentId),
              ),
            )

          if (input.variants.length > 0) {
            await tx.insert(FunnelExperimentVariantTable).values(
              input.variants.map((v) => ({
                workspaceId: Actor.workspaceId(),
                funnelExperimentId: input.experimentId!,
                funnelVariantId: v.funnelVariantId,
                weight: v.weight,
              })),
            )
          }

          return input.experimentId
        }

        const experimentId = Identifier.create('funnel_experiment')

        await tx.insert(FunnelExperimentTable).values({
          id: experimentId,
          workspaceId: Actor.workspaceId(),
          funnelId: input.funnelId,
          name: input.name,
        })

        if (input.variants.length > 0) {
          await tx.insert(FunnelExperimentVariantTable).values(
            input.variants.map((v) => ({
              workspaceId: Actor.workspaceId(),
              funnelExperimentId: experimentId,
              funnelVariantId: v.funnelVariantId,
              weight: v.weight,
            })),
          )
        }

        return experimentId
      })
    },
  )

  export const startExperiment = fn(Identifier.schema('funnel_experiment'), async (experimentId) => {
    // Fetch the experiment + check for any other active experiment on the same funnel in one query
    const experiments = await Database.use((tx) =>
      tx
        .select()
        .from(FunnelExperimentTable)
        .where(
          and(
            eq(FunnelExperimentTable.workspaceId, Actor.workspaceId()),
            sql`(${FunnelExperimentTable.id} = ${experimentId} OR (${FunnelExperimentTable.startedAt} IS NOT NULL AND ${FunnelExperimentTable.endedAt} IS NULL))`,
          ),
        ),
    )

    const experiment = experiments.find((e) => e.id === experimentId)
    if (!experiment) throw new Error('Experiment not found')
    if (experiment.startedAt) throw new FunnelExperimentAlreadyStartedError()

    const activeExperiment = experiments.find(
      (e) => e.id !== experimentId && e.startedAt && !e.endedAt && e.funnelId === experiment.funnelId,
    )
    if (activeExperiment) throw new FunnelExperimentAlreadyActiveError()

    // Fetch experiment variants + check if each has a published version
    const experimentVariants = await Database.use((tx) =>
      tx
        .select({
          funnelVariantId: FunnelExperimentVariantTable.funnelVariantId,
          weight: FunnelExperimentVariantTable.weight,
          publishedVersion: FunnelVariantTable.publishedVersion,
        })
        .from(FunnelExperimentVariantTable)
        .innerJoin(
          FunnelVariantTable,
          and(
            eq(FunnelVariantTable.workspaceId, FunnelExperimentVariantTable.workspaceId),
            eq(FunnelVariantTable.id, FunnelExperimentVariantTable.funnelVariantId),
          ),
        )
        .where(
          and(
            eq(FunnelExperimentVariantTable.workspaceId, Actor.workspaceId()),
            eq(FunnelExperimentVariantTable.funnelExperimentId, experimentId),
          ),
        ),
    )
    if (experimentVariants.length === 0) throw new FunnelExperimentNoVariantsError()

    const totalWeight = experimentVariants.reduce((sum, v) => sum + v.weight, 0)
    if (totalWeight !== 100) throw new FunnelExperimentInvalidWeightsError()

    for (const v of experimentVariants) {
      if (v.publishedVersion === null) throw new FunnelExperimentVariantNotPublishedError()
    }

    await Database.use((tx) =>
      tx
        .update(FunnelExperimentTable)
        .set({ startedAt: sql`NOW(3)` })
        .where(
          and(eq(FunnelExperimentTable.workspaceId, Actor.workspaceId()), eq(FunnelExperimentTable.id, experimentId)),
        ),
    )
  })

  export const endExperiment = fn(Identifier.schema('funnel_experiment'), async (experimentId) => {
    await Database.use(async (tx) => {
      const experiment = await tx
        .select()
        .from(FunnelExperimentTable)
        .where(
          and(eq(FunnelExperimentTable.workspaceId, Actor.workspaceId()), eq(FunnelExperimentTable.id, experimentId)),
        )
        .then((rows) => rows[0])
      if (!experiment) throw new Error('Experiment not found')
      if (!experiment.startedAt) throw new FunnelExperimentNotStartedError()
      if (experiment.endedAt) throw new FunnelExperimentAlreadyEndedError()

      await tx
        .update(FunnelExperimentTable)
        .set({ endedAt: sql`NOW(3)` })
        .where(
          and(eq(FunnelExperimentTable.workspaceId, Actor.workspaceId()), eq(FunnelExperimentTable.id, experimentId)),
        )
    })
  })

  export const selectExperimentWinner = fn(
    z.object({
      experimentId: Identifier.schema('funnel_experiment'),
      funnelVariantId: Identifier.schema('funnel_variant'),
    }),
    async (input) => {
      await Database.transaction(async (tx) => {
        const rows = await tx
          .select({
            ...getTableColumns(FunnelExperimentTable),
            experimentVariantId: FunnelExperimentVariantTable.funnelVariantId,
          })
          .from(FunnelExperimentTable)
          .leftJoin(
            FunnelExperimentVariantTable,
            and(
              eq(FunnelExperimentVariantTable.workspaceId, FunnelExperimentTable.workspaceId),
              eq(FunnelExperimentVariantTable.funnelExperimentId, FunnelExperimentTable.id),
            ),
          )
          .where(
            and(
              eq(FunnelExperimentTable.workspaceId, Actor.workspaceId()),
              eq(FunnelExperimentTable.id, input.experimentId),
            ),
          )
        if (rows.length === 0) throw new Error('Experiment not found')

        const experiment = rows[0]!
        if (!experiment.startedAt) throw new FunnelExperimentNotStartedError()
        if (experiment.winnerVariantId) throw new FunnelExperimentWinnerAlreadySelectedError()

        const isValid = rows.some((r) => r.experimentVariantId === input.funnelVariantId)
        if (!isValid) throw new FunnelExperimentVariantInvalidError()

        await tx
          .update(FunnelExperimentTable)
          .set({
            winnerVariantId: input.funnelVariantId,
            ...(!experiment.endedAt ? { endedAt: sql`NOW(3)` } : {}),
          })
          .where(
            and(
              eq(FunnelExperimentTable.workspaceId, Actor.workspaceId()),
              eq(FunnelExperimentTable.id, input.experimentId),
            ),
          )

        await tx
          .update(FunnelTable)
          .set({ mainVariantId: input.funnelVariantId })
          .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, experiment.funnelId)))
      })
    },
  )

  export const getUrl = fn(
    z.object({
      shortId: z.string(),
      hostname: z.string().optional(),
    }),
    (input) => {
      if (process.env.DEV === 'true') return `http://localhost:3000/f/${input.shortId}`
      return `https://${input.hostname ?? process.env.WEB_DOMAIN}/f/${input.shortId}`
    },
  )
}
