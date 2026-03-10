import { and, desc, eq, getTableColumns, isNull, max, sql } from 'drizzle-orm'
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
import {
  FunnelFileTable,
  FunnelReleaseTable,
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

  /**
   * Unified public lookup.
   * Looks up funnel by shortId → gets current release → resolves variant
   * (uses funnelVariantId if provided for cookie-based assignment, otherwise random) →
   * returns latest version of assigned variant.
   */
  export const get = fn(
    z.object({
      funnelShortId: z.string().length(8),
      funnelVariantId: z.string().optional(),
    }),
    async (input) => {
      return Database.use(async (tx) => {
        const funnel = await tx
          .select({
            ...getTableColumns(FunnelTable),
            domain: DomainTable,
            release: FunnelReleaseTable,
          })
          .from(FunnelTable)
          .leftJoin(DomainTable, eq(DomainTable.id, FunnelTable.domainId))
          .innerJoin(FunnelReleaseTable, eq(FunnelReleaseTable.id, FunnelTable.activeReleaseId))
          .where(and(eq(FunnelTable.shortId, input.funnelShortId), isNull(FunnelTable.archivedAt)))
          .then((rows) => rows[0])
        if (!funnel) return

        const variantId = (() => {
          if (input.funnelVariantId) {
            const isValid = funnel.release.trafficSplit.some(
              (s) => s.funnelVariantId === input.funnelVariantId && s.percentage > 0,
            )
            if (isValid) return input.funnelVariantId
          }

          const activeSplits = funnel.release.trafficSplit.filter((s) => s.percentage > 0)
          if (activeSplits.length === 0) return undefined

          const rand = Math.random() * 100
          let cumulative = 0
          for (const split of activeSplits) {
            cumulative += split.percentage
            if (rand < cumulative) return split.funnelVariantId
          }

          return activeSplits[activeSplits.length - 1]!.funnelVariantId
        })()
        if (!variantId) return

        const variantVersion = await tx
          .select()
          .from(FunnelVariantVersionTable)
          .where(
            and(
              eq(FunnelVariantVersionTable.workspaceId, funnel.workspaceId),
              eq(FunnelVariantVersionTable.funnelId, funnel.id),
              eq(FunnelVariantVersionTable.funnelVariantId, variantId),
            ),
          )
          .orderBy(desc(FunnelVariantVersionTable.number))
          .limit(1)
          .then((rows) => rows[0])
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
      })
    },
  )

  export const getDraft = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant').optional(),
    }),
    async (input) => {
      return Database.use(async (tx) => {
        const funnel = await tx
          .select({
            ...getTableColumns(FunnelTable),
            domain: DomainTable,
          })
          .from(FunnelTable)
          .leftJoin(DomainTable, eq(DomainTable.id, FunnelTable.domainId))
          .where(
            and(
              eq(FunnelTable.workspaceId, Actor.workspaceId()),
              eq(FunnelTable.id, input.funnelId),
              isNull(FunnelTable.archivedAt),
            ),
          )
          .then((rows) => rows[0])
        if (!funnel) return

        let variantId = input.funnelVariantId
        if (!variantId) {
          const firstVariant = await tx
            .select({ id: FunnelVariantTable.id })
            .from(FunnelVariantTable)
            .where(
              and(
                eq(FunnelVariantTable.workspaceId, Actor.workspaceId()),
                eq(FunnelVariantTable.funnelId, input.funnelId),
                isNull(FunnelVariantTable.archivedAt),
              ),
            )
            .orderBy(desc(FunnelVariantTable.updatedAt))
            .limit(1)
            .then((rows) => rows[0])
          if (!firstVariant) return
          variantId = firstVariant.id
        }

        const variant = await tx
          .select({
            ...getTableColumns(FunnelVariantTable),
            draft: FunnelVariantDraftTable,
          })
          .from(FunnelVariantTable)
          .innerJoin(
            FunnelVariantDraftTable,
            and(
              eq(FunnelVariantDraftTable.workspaceId, FunnelVariantTable.workspaceId),
              eq(FunnelVariantDraftTable.funnelId, FunnelVariantTable.funnelId),
              eq(FunnelVariantDraftTable.funnelVariantId, FunnelVariantTable.id),
            ),
          )
          .where(
            and(
              eq(FunnelVariantTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantTable.id, variantId),
              isNull(FunnelVariantTable.archivedAt),
            ),
          )
          .then((rows) => rows[0])
        if (!variant) return

        return {
          id: funnel.id,
          workspaceId: funnel.workspaceId,
          shortId: funnel.shortId,
          variantId: variant.id,
          url: getUrl({ shortId: funnel.shortId, hostname: funnel.domain?.hostname }),
          title: funnel.title,
          variantTitle: variant.title,
          pages: variant.draft.pages,
          rules: variant.draft.rules,
          variables: variant.draft.variables,
          theme: variant.draft.theme,
          hasChanges: variant.hasDraft,
          settings: { ...funnel.settings, ...funnel.domain?.settings },
          createdAt: funnel.createdAt,
        }
      })
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
    const shortId = id.slice(-8)
    const variantId = Identifier.create('funnel_variant')
    const domain = await Domain.get()

    const pages = DEFAULT_PAGES()

    await Database.use(async (tx) => {
      await tx.insert(FunnelTable).values({
        id,
        workspaceId: Actor.workspaceId(),
        shortId,
        title: 'New funnel',
        domainId: domain?.id,
        originalVariantId: variantId,
      })

      await tx.insert(FunnelVariantTable).values({
        id: variantId,
        workspaceId: Actor.workspaceId(),
        funnelId: id,
        title: 'Original variant',
      })

      await tx.insert(FunnelVariantDraftTable).values({
        id: Identifier.create('funnel_variant_draft'),
        workspaceId: Actor.workspaceId(),
        funnelId: id,
        funnelVariantId: variantId,
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
      await Database.use(async (tx) => {
        await tx
          .update(FunnelVariantDraftTable)
          .set({
            ...(input.pages && { pages: input.pages }),
            ...(input.rules && { rules: input.rules }),
            ...(input.variables && { variables: input.variables }),
            ...(input.theme && { theme: input.theme }),
          })
          .where(
            and(
              eq(FunnelVariantDraftTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantDraftTable.funnelVariantId, input.funnelVariantId),
            ),
          )

        await tx
          .update(FunnelVariantTable)
          .set({ hasDraft: true })
          .where(
            and(
              eq(FunnelVariantTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantTable.id, input.funnelVariantId),
            ),
          )
      })
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

  export const commit = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant'),
    }),
    async (input) => {
      await Billing.assert()
      await Database.use(async (tx) => {
        const funnel = await tx
          .select()
          .from(FunnelTable)
          .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, input.funnelId)))
          .then((rows) => rows[0])
        if (!funnel) return

        const draft = await tx
          .select()
          .from(FunnelVariantDraftTable)
          .where(
            and(
              eq(FunnelVariantDraftTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantDraftTable.funnelId, input.funnelId),
              eq(FunnelVariantDraftTable.funnelVariantId, input.funnelVariantId),
            ),
          )
          .then((rows) => rows[0])
        if (!draft) return

        const latestVariantVersion = await getLatestVariantVersionNumber({
          funnelId: input.funnelId,
          funnelVariantId: input.funnelVariantId,
        })
        const nextVariantVersion = (latestVariantVersion ?? 0) + 1

        await tx.insert(FunnelVariantVersionTable).values({
          workspaceId: Actor.workspaceId(),
          funnelId: input.funnelId,
          funnelVariantId: input.funnelVariantId,
          number: nextVariantVersion,
          pages: draft.pages,
          rules: draft.rules,
          variables: draft.variables,
          theme: draft.theme,
        })

        await tx
          .update(FunnelVariantTable)
          .set({ hasDraft: false })
          .where(
            and(
              eq(FunnelVariantTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantTable.id, input.funnelVariantId),
            ),
          )

        if (!funnel.activeReleaseId) {
          const releaseId = Identifier.create('funnel_release')
          await tx.insert(FunnelReleaseTable).values({
            id: releaseId,
            workspaceId: Actor.workspaceId(),
            funnelId: input.funnelId,
            trafficSplit: [{ funnelVariantId: input.funnelVariantId, percentage: 100 }],
          })
          await tx
            .update(FunnelTable)
            .set({ activeReleaseId: releaseId })
            .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, input.funnelId)))
        }
      })

      await Question.sync({ funnelId: input.funnelId, funnelVariantId: input.funnelVariantId })
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

      await Database.use(async (tx) => {
        const sourceDraft = await Funnel.getDraft({ funnelId: input.id })
        if (!sourceDraft) throw new Error('Funnel not found')

        const title = input.title || `${sourceDraft.title} copy`
        const domain = await Domain.get()

        await tx.insert(FunnelTable).values({
          id: newId,
          workspaceId: Actor.workspaceId(),
          shortId,
          title,
          domainId: domain?.id,
        })

        await tx.insert(FunnelVariantTable).values({
          id: variantId,
          workspaceId: Actor.workspaceId(),
          funnelId: newId,
          title: 'Main',
        })

        await tx.insert(FunnelVariantDraftTable).values({
          id: Identifier.create('funnel_variant_draft'),
          workspaceId: Actor.workspaceId(),
          funnelId: newId,
          funnelVariantId: variantId,
          pages: sourceDraft.pages,
          rules: sourceDraft.rules,
          variables: sourceDraft.variables,
          theme: sourceDraft.theme,
        })

        const files = await tx
          .select()
          .from(FunnelFileTable)
          .where(and(eq(FunnelFileTable.workspaceId, Actor.workspaceId()), eq(FunnelFileTable.funnelId, input.id)))

        if (files.length > 0) {
          await tx.insert(FunnelFileTable).values(
            files.map((f) => ({
              funnelId: newId,
              workspaceId: Actor.workspaceId(),
              fileId: f.fileId,
            })),
          )
        }
      })

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
          activeReleaseId: null,
        })
        .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, id)))
    })
  })

  export const createVariant = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      title: z.string().min(1).max(255),
    }),
    (input) => {
      return Database.use(async (tx) => {
        const id = Identifier.create('funnel_variant')

        // Verify the funnel exists and isn't archived
        const funnel = await tx
          .select({ id: FunnelTable.id, originalVariantId: FunnelTable.originalVariantId })
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
        if (!funnel.originalVariantId) throw new Error('Funnel has no original variant')

        // Fetch the original variant's draft to copy from
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
              eq(FunnelVariantTable.id, funnel.originalVariantId),
              isNull(FunnelVariantTable.archivedAt),
            ),
          )
          .then((rows) => rows[0])
        if (!sourceVariant) throw new Error('Original variant not found')

        await tx.insert(FunnelVariantTable).values({
          id,
          workspaceId: Actor.workspaceId(),
          funnelId: input.funnelId,
          title: input.title,
        })

        await tx.insert(FunnelVariantDraftTable).values({
          id: Identifier.create('funnel_variant_draft'),
          workspaceId: Actor.workspaceId(),
          funnelId: input.funnelId,
          funnelVariantId: id,
          pages: sourceVariant.draft.pages,
          rules: sourceVariant.draft.rules,
          variables: sourceVariant.draft.variables,
          theme: sourceVariant.draft.theme,
        })

        return id
      })
    },
  )

  export const listVariants = fn(Identifier.schema('funnel'), async (funnelId) => {
    return Database.use(async (tx) => {
      const funnel = await tx
        .select({
          originalVariantId: FunnelTable.originalVariantId,
          release: FunnelReleaseTable,
        })
        .from(FunnelTable)
        .leftJoin(FunnelReleaseTable, eq(FunnelReleaseTable.id, FunnelTable.activeReleaseId))
        .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, funnelId)))
        .then((rows) => rows[0])
      if (!funnel) return []

      const trafficSplit = funnel.release?.trafficSplit ?? []

      const variants = await tx
        .select()
        .from(FunnelVariantTable)
        .where(
          and(
            eq(FunnelVariantTable.workspaceId, Actor.workspaceId()),
            eq(FunnelVariantTable.funnelId, funnelId),
            isNull(FunnelVariantTable.archivedAt),
          ),
        )
        .orderBy(FunnelVariantTable.createdAt)

      return variants.map((variant) => ({
        id: variant.id,
        funnelId: variant.funnelId,
        title: variant.title,
        hasDraft: variant.hasDraft,
        isOriginal: variant.id === funnel.originalVariantId,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
        trafficPercentage: trafficSplit.find((s) => s.funnelVariantId === variant.id)?.percentage ?? 0,
      }))
    })
  })

  export const release = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      trafficSplit: z.array(
        z.object({
          funnelVariantId: z.string(),
          percentage: z.number().int().min(0).max(100),
        }),
      ),
    }),
    async (input) => {
      await Billing.assert()

      const totalPercentage = input.trafficSplit.reduce((sum, s) => sum + s.percentage, 0)
      if (totalPercentage !== 100) {
        throw new Error(`Traffic split percentages must sum to 100, got ${totalPercentage}`)
      }

      const releaseId = Identifier.create('funnel_release')

      await Database.use(async (tx) => {
        const funnel = await tx
          .select()
          .from(FunnelTable)
          .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, input.funnelId)))
          .then((rows) => rows[0])
        if (!funnel) throw new Error('Funnel not found')

        for (const split of input.trafficSplit) {
          const latestVariantVersion = await getLatestVariantVersionNumber({
            funnelId: input.funnelId,
            funnelVariantId: split.funnelVariantId,
          })

          if (latestVariantVersion === null) {
            const variantDraft = await tx
              .select()
              .from(FunnelVariantDraftTable)
              .where(
                and(
                  eq(FunnelVariantDraftTable.workspaceId, Actor.workspaceId()),
                  eq(FunnelVariantDraftTable.funnelId, input.funnelId),
                  eq(FunnelVariantDraftTable.funnelVariantId, split.funnelVariantId),
                ),
              )
              .then((rows) => rows[0])
            if (!variantDraft) throw new Error(`No draft found for variant ${split.funnelVariantId}`)

            await tx.insert(FunnelVariantVersionTable).values({
              workspaceId: Actor.workspaceId(),
              funnelId: input.funnelId,
              funnelVariantId: split.funnelVariantId,
              number: 1,
              pages: variantDraft.pages,
              rules: variantDraft.rules,
              variables: variantDraft.variables,
              theme: variantDraft.theme,
            })

            await Question.sync({ funnelId: input.funnelId, funnelVariantId: split.funnelVariantId })
          }
        }

        await tx.insert(FunnelReleaseTable).values({
          id: releaseId,
          workspaceId: Actor.workspaceId(),
          funnelId: input.funnelId,
          trafficSplit: input.trafficSplit,
        })

        await tx
          .update(FunnelTable)
          .set({ activeReleaseId: releaseId })
          .where(and(eq(FunnelTable.workspaceId, Actor.workspaceId()), eq(FunnelTable.id, input.funnelId)))
      })

      return releaseId
    },
  )

  export const deactivateAll = fn(z.void(), async () => {
    await Database.use(async (tx) => {
      await tx
        .update(FunnelTable)
        .set({ activeReleaseId: null })
        .where(eq(FunnelTable.workspaceId, Actor.workspaceId()))
    })
  })

  const getLatestVariantVersionNumber = fn(
    z.object({
      funnelId: z.string(),
      funnelVariantId: z.string(),
    }),
    async (input) => {
      return Database.use(async (tx) => {
        const result = await tx
          .select({ number: max(FunnelVariantVersionTable.number) })
          .from(FunnelVariantVersionTable)
          .where(
            and(
              eq(FunnelVariantVersionTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantVersionTable.funnelId, input.funnelId),
              eq(FunnelVariantVersionTable.funnelVariantId, input.funnelVariantId),
            ),
          )
          .then((rows) => rows[0])
        return result?.number
      })
    },
  )

  const getUrl = fn(
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
