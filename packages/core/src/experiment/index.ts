import { and, desc, eq, getTableColumns, isNotNull, isNull, sql } from 'drizzle-orm'
import z from 'zod'
import { Actor } from '../actor'
import { CampaignFunnelTable, CampaignTable } from '../campaign/index.sql'
import { Database } from '../database'
import { FunnelTable } from '../funnel/index.sql'
import { Identifier } from '../identifier'
import { fn } from '../utils/fn'
import {
  ExperimentAlreadyActiveError,
  ExperimentAlreadyEndedError,
  ExperimentAlreadyStartedError,
  ExperimentInvalidWeightsError,
  ExperimentNoVariantsError,
  ExperimentNotStartedError,
  ExperimentVariantInvalidError,
  ExperimentVariantNotPublishedError,
  ExperimentWinnerAlreadySelectedError,
} from './error'
import { ExperimentTable, ExperimentVariantTable } from './index.sql'

export namespace Experiment {
  export const list = fn(z.void(), () =>
    Database.use((tx) =>
      tx
        .select({
          ...getTableColumns(ExperimentTable),
          campaignName: CampaignTable.name,
        })
        .from(ExperimentTable)
        .innerJoin(
          CampaignTable,
          and(
            eq(CampaignTable.workspaceId, ExperimentTable.workspaceId),
            eq(CampaignTable.id, ExperimentTable.campaignId),
          ),
        )
        .where(and(eq(ExperimentTable.workspaceId, Actor.workspace()), isNull(ExperimentTable.archivedAt)))
        .orderBy(desc(ExperimentTable.createdAt))
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            campaignId: row.campaignId,
            campaignName: row.campaignName,
            name: row.name,
            status: row.endedAt ? ('ended' as const) : row.startedAt ? ('started' as const) : ('draft' as const),
            startedAt: row.startedAt,
            endedAt: row.endedAt,
            controlVariantId: row.controlVariantId,
            winnerVariantId: row.winnerVariantId,
            createdAt: row.createdAt,
          })),
        ),
    ),
  )

  export const fromId = fn(Identifier.schema('experiment'), async (experimentId) => {
    return Database.use(async (tx) => {
      const experiment = await tx
        .select({
          ...getTableColumns(ExperimentTable),
          campaignName: CampaignTable.name,
        })
        .from(ExperimentTable)
        .innerJoin(
          CampaignTable,
          and(
            eq(CampaignTable.workspaceId, ExperimentTable.workspaceId),
            eq(CampaignTable.id, ExperimentTable.campaignId),
          ),
        )
        .where(and(eq(ExperimentTable.workspaceId, Actor.workspace()), eq(ExperimentTable.id, experimentId)))
        .then((rows) => rows[0])
      if (!experiment) return

      const experimentVariants = await tx
        .select({
          id: ExperimentVariantTable.id,
          funnelId: ExperimentVariantTable.funnelId,
          weight: ExperimentVariantTable.weight,
          funnelTitle: FunnelTable.title,
        })
        .from(ExperimentVariantTable)
        .innerJoin(
          FunnelTable,
          and(
            eq(FunnelTable.workspaceId, ExperimentVariantTable.workspaceId),
            eq(FunnelTable.id, ExperimentVariantTable.funnelId),
          ),
        )
        .where(
          and(
            eq(ExperimentVariantTable.workspaceId, Actor.workspace()),
            eq(ExperimentVariantTable.experimentId, experimentId),
          ),
        )

      const variants = experimentVariants
        .map((variant) => ({
          id: variant.id,
          funnelId: variant.funnelId,
          funnelTitle: variant.funnelTitle,
          weight: variant.weight,
          isControl: variant.id === experiment.controlVariantId,
          isWinner: variant.id === experiment.winnerVariantId,
        }))
        .sort((a, b) => b.weight - a.weight)

      return {
        id: experiment.id,
        campaignId: experiment.campaignId,
        campaignName: experiment.campaignName,
        name: experiment.name,
        status: experiment.endedAt
          ? ('ended' as const)
          : experiment.startedAt
            ? ('started' as const)
            : ('draft' as const),
        startedAt: experiment.startedAt,
        endedAt: experiment.endedAt,
        controlVariantId: experiment.controlVariantId,
        winnerVariantId: experiment.winnerVariantId,
        createdAt: experiment.createdAt,
        variants,
      }
    })
  })

  export const addFunnel = fn(
    z.object({
      campaignId: Identifier.schema('campaign'),
      funnelId: Identifier.schema('funnel'),
    }),
    async (input) => {
      return Database.use(async (tx) => {
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

        let activeExperiment = await tx
          .select()
          .from(ExperimentTable)
          .where(
            and(
              eq(ExperimentTable.workspaceId, Actor.workspace()),
              eq(ExperimentTable.campaignId, input.campaignId),
              isNotNull(ExperimentTable.startedAt),
              isNull(ExperimentTable.endedAt),
              isNull(ExperimentTable.archivedAt),
            ),
          )
          .then((rows) => rows[0])

        if (!activeExperiment) {
          activeExperiment = await tx
            .select()
            .from(ExperimentTable)
            .where(
              and(
                eq(ExperimentTable.workspaceId, Actor.workspace()),
                eq(ExperimentTable.campaignId, input.campaignId),
                isNull(ExperimentTable.startedAt),
                isNull(ExperimentTable.endedAt),
                isNull(ExperimentTable.archivedAt),
              ),
            )
            .orderBy(desc(ExperimentTable.createdAt))
            .then((rows) => rows[0])
        }

        const nextDefaultFunnelId = campaign.defaultFunnelId ?? input.funnelId
        const variantId = Identifier.create('experiment_variant')

        if (activeExperiment) {
          await tx.insert(ExperimentVariantTable).values({
            id: variantId,
            workspaceId: Actor.workspace(),
            experimentId: activeExperiment.id,
            funnelId: input.funnelId,
            weight: 0,
          })

          const nextControlVariantId =
            nextDefaultFunnelId === input.funnelId ? variantId : activeExperiment.controlVariantId

          await tx
            .update(ExperimentTable)
            .set({ controlVariantId: nextControlVariantId })
            .where(and(eq(ExperimentTable.workspaceId, Actor.workspace()), eq(ExperimentTable.id, activeExperiment.id)))

          if (!campaign.defaultFunnelId) {
            await tx
              .update(CampaignTable)
              .set({ defaultFunnelId: input.funnelId })
              .where(and(eq(CampaignTable.workspaceId, Actor.workspace()), eq(CampaignTable.id, input.campaignId)))
          }

          return activeExperiment.id
        }

        const experimentId = Identifier.create('experiment')
        await tx.insert(ExperimentTable).values({
          id: experimentId,
          workspaceId: Actor.workspace(),
          campaignId: input.campaignId,
          name: 'Experiment 1',
          ...(nextDefaultFunnelId === input.funnelId ? { controlVariantId: variantId } : {}),
        })

        await tx.insert(ExperimentVariantTable).values({
          id: variantId,
          workspaceId: Actor.workspace(),
          experimentId,
          funnelId: input.funnelId,
          weight: 100,
        })

        if (!campaign.defaultFunnelId) {
          await tx
            .update(CampaignTable)
            .set({ defaultFunnelId: input.funnelId })
            .where(and(eq(CampaignTable.workspaceId, Actor.workspace()), eq(CampaignTable.id, input.campaignId)))
        }

        return experimentId
      })
    },
  )

  export const update = fn(
    z.object({
      id: Identifier.schema('experiment'),
      name: z.string().min(1).max(255),
      controlFunnelId: Identifier.schema('funnel'),
      variants: z.array(
        z.object({
          funnelId: Identifier.schema('funnel'),
          weight: z.number().int().min(0).max(100),
        }),
      ),
    }),
    async (input) => {
      await Database.use(async (tx) => {
        const experiment = await tx
          .select(getTableColumns(ExperimentTable))
          .from(ExperimentTable)
          .where(and(eq(ExperimentTable.workspaceId, Actor.workspace()), eq(ExperimentTable.id, input.id)))
          .then((rows) => rows[0])
        if (!experiment) throw new Error('Experiment not found')
        if (experiment.endedAt) throw new ExperimentAlreadyEndedError()

        const existingVariants = await tx
          .select({
            id: ExperimentVariantTable.id,
            funnelId: ExperimentVariantTable.funnelId,
          })
          .from(ExperimentVariantTable)
          .where(
            and(
              eq(ExperimentVariantTable.workspaceId, Actor.workspace()),
              eq(ExperimentVariantTable.experimentId, input.id),
            ),
          )

        const existingVariantByFunnelId = new Map(existingVariants.map((variant) => [variant.funnelId, variant.id]))
        const campaignFunnels = await tx
          .select({ funnelId: CampaignFunnelTable.funnelId })
          .from(CampaignFunnelTable)
          .where(
            and(
              eq(CampaignFunnelTable.workspaceId, Actor.workspace()),
              eq(CampaignFunnelTable.campaignId, experiment.campaignId),
            ),
          )

        const campaignFunnelIds = new Set(campaignFunnels.map((funnel) => funnel.funnelId))
        if (!campaignFunnelIds.has(input.controlFunnelId)) throw new ExperimentVariantInvalidError()
        if (input.variants.some((variant) => !campaignFunnelIds.has(variant.funnelId))) {
          throw new ExperimentVariantInvalidError()
        }

        const nextVariants = input.variants.map((variant) => ({
          id: existingVariantByFunnelId.get(variant.funnelId) ?? Identifier.create('experiment_variant'),
          funnelId: variant.funnelId,
          weight: variant.weight,
        }))

        await tx
          .delete(ExperimentVariantTable)
          .where(
            and(
              eq(ExperimentVariantTable.workspaceId, Actor.workspace()),
              eq(ExperimentVariantTable.experimentId, input.id),
            ),
          )

        if (nextVariants.length > 0) {
          await tx.insert(ExperimentVariantTable).values(
            nextVariants.map((variant) => ({
              id: variant.id,
              workspaceId: Actor.workspace(),
              experimentId: input.id,
              funnelId: variant.funnelId,
              weight: variant.weight,
            })),
          )
        }

        const controlVariantId = nextVariants.find((variant) => variant.funnelId === input.controlFunnelId)?.id
        const winnerVariantId = nextVariants.some((variant) => variant.id === experiment.winnerVariantId)
          ? experiment.winnerVariantId
          : null

        await tx
          .update(ExperimentTable)
          .set({
            name: input.name,
            controlVariantId: controlVariantId ?? null,
            winnerVariantId,
          })
          .where(and(eq(ExperimentTable.workspaceId, Actor.workspace()), eq(ExperimentTable.id, input.id)))
      })
    },
  )

  export const start = fn(Identifier.schema('experiment'), async (experimentId) => {
    const experiment = await Database.use((tx) =>
      tx
        .select()
        .from(ExperimentTable)
        .where(and(eq(ExperimentTable.workspaceId, Actor.workspace()), eq(ExperimentTable.id, experimentId)))
        .then((rows) => rows[0]),
    )
    if (!experiment) throw new Error('Experiment not found')
    if (experiment.startedAt) throw new ExperimentAlreadyStartedError()

    const activeExperiment = await Database.use((tx) =>
      tx
        .select({ id: ExperimentTable.id })
        .from(ExperimentTable)
        .where(
          and(
            eq(ExperimentTable.workspaceId, Actor.workspace()),
            eq(ExperimentTable.campaignId, experiment.campaignId),
            isNull(ExperimentTable.archivedAt),
            isNotNull(ExperimentTable.startedAt),
            isNull(ExperimentTable.endedAt),
          ),
        )
        .then((rows) => rows[0]),
    )
    if (activeExperiment) throw new ExperimentAlreadyActiveError()

    const experimentVariants = await Database.use((tx) =>
      tx
        .select({
          id: ExperimentVariantTable.id,
          funnelId: ExperimentVariantTable.funnelId,
          weight: ExperimentVariantTable.weight,
          publishedVersion: FunnelTable.publishedVersion,
        })
        .from(ExperimentVariantTable)
        .innerJoin(
          FunnelTable,
          and(
            eq(FunnelTable.workspaceId, ExperimentVariantTable.workspaceId),
            eq(FunnelTable.id, ExperimentVariantTable.funnelId),
          ),
        )
        .where(
          and(
            eq(ExperimentVariantTable.workspaceId, Actor.workspace()),
            eq(ExperimentVariantTable.experimentId, experimentId),
          ),
        ),
    )
    if (experimentVariants.length === 0) throw new ExperimentNoVariantsError()

    const totalWeight = experimentVariants.reduce((sum, variant) => sum + variant.weight, 0)
    if (totalWeight !== 100) throw new ExperimentInvalidWeightsError()

    for (const variant of experimentVariants) {
      if (variant.publishedVersion === null) throw new ExperimentVariantNotPublishedError()
    }

    await Database.use((tx) =>
      tx
        .update(ExperimentTable)
        .set({ startedAt: sql`NOW(3)` })
        .where(and(eq(ExperimentTable.workspaceId, Actor.workspace()), eq(ExperimentTable.id, experimentId))),
    )
  })

  export const end = fn(Identifier.schema('experiment'), async (experimentId) => {
    await Database.use(async (tx) => {
      const experiment = await tx
        .select()
        .from(ExperimentTable)
        .where(and(eq(ExperimentTable.workspaceId, Actor.workspace()), eq(ExperimentTable.id, experimentId)))
        .then((rows) => rows[0])
      if (!experiment) throw new Error('Experiment not found')
      if (!experiment.startedAt) throw new ExperimentNotStartedError()
      if (experiment.endedAt) throw new ExperimentAlreadyEndedError()

      await tx
        .update(ExperimentTable)
        .set({ endedAt: sql`NOW(3)` })
        .where(and(eq(ExperimentTable.workspaceId, Actor.workspace()), eq(ExperimentTable.id, experimentId)))
    })
  })

  export const selectWinner = fn(
    z.object({
      experimentId: Identifier.schema('experiment'),
      experimentVariantId: Identifier.schema('experiment_variant'),
    }),
    async (input) => {
      await Database.transaction(async (tx) => {
        const rows = await tx
          .select({
            ...getTableColumns(ExperimentTable),
            variantId: ExperimentVariantTable.id,
            variantFunnelId: ExperimentVariantTable.funnelId,
          })
          .from(ExperimentTable)
          .leftJoin(
            ExperimentVariantTable,
            and(
              eq(ExperimentVariantTable.workspaceId, ExperimentTable.workspaceId),
              eq(ExperimentVariantTable.experimentId, ExperimentTable.id),
            ),
          )
          .where(and(eq(ExperimentTable.workspaceId, Actor.workspace()), eq(ExperimentTable.id, input.experimentId)))
        if (rows.length === 0) throw new Error('Experiment not found')

        const experiment = rows[0]
        if (!experiment) throw new Error('Experiment not found')
        if (!experiment.startedAt) throw new ExperimentNotStartedError()
        if (experiment.winnerVariantId) throw new ExperimentWinnerAlreadySelectedError()

        const winningVariant = rows.find((row) => row.variantId === input.experimentVariantId)
        if (!winningVariant || !winningVariant.variantFunnelId) throw new ExperimentVariantInvalidError()

        await tx
          .update(ExperimentTable)
          .set({
            winnerVariantId: input.experimentVariantId,
            ...(!experiment.endedAt ? { endedAt: sql`NOW(3)` } : {}),
          })
          .where(and(eq(ExperimentTable.workspaceId, Actor.workspace()), eq(ExperimentTable.id, input.experimentId)))

        await tx
          .update(CampaignTable)
          .set({ defaultFunnelId: winningVariant.variantFunnelId })
          .where(and(eq(CampaignTable.workspaceId, Actor.workspace()), eq(CampaignTable.id, experiment.campaignId)))
      })
    },
  )

  export const create = fn(
    z.object({
      campaignId: Identifier.schema('campaign'),
      name: z.string().min(1).max(255),
      controlFunnelId: Identifier.schema('funnel'),
      variants: z.array(
        z.object({
          funnelId: Identifier.schema('funnel'),
          weight: z.number().int().min(0).max(100),
        }),
      ),
    }),
    async (input) => {
      return Database.transaction(async (tx) => {
        const campaign = await tx
          .select({ id: CampaignTable.id, defaultFunnelId: CampaignTable.defaultFunnelId })
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

        const activeExperiment = await tx
          .select({ id: ExperimentTable.id })
          .from(ExperimentTable)
          .where(
            and(
              eq(ExperimentTable.workspaceId, Actor.workspace()),
              eq(ExperimentTable.campaignId, input.campaignId),
              isNotNull(ExperimentTable.startedAt),
              isNull(ExperimentTable.endedAt),
              isNull(ExperimentTable.archivedAt),
            ),
          )
          .then((rows) => rows[0])
        if (activeExperiment) throw new ExperimentAlreadyActiveError()

        const campaignFunnels = await tx
          .select({ funnelId: CampaignFunnelTable.funnelId })
          .from(CampaignFunnelTable)
          .where(
            and(
              eq(CampaignFunnelTable.workspaceId, Actor.workspace()),
              eq(CampaignFunnelTable.campaignId, input.campaignId),
            ),
          )
        const campaignFunnelIds = new Set(campaignFunnels.map((f) => f.funnelId))

        if (!campaignFunnelIds.has(input.controlFunnelId)) throw new ExperimentVariantInvalidError()
        if (input.variants.some((v) => !campaignFunnelIds.has(v.funnelId))) throw new ExperimentVariantInvalidError()

        const totalWeight = input.variants.reduce((sum, v) => sum + v.weight, 0)
        if (totalWeight !== 100) throw new ExperimentInvalidWeightsError()

        const funnelPublishStatus = await tx
          .select({ id: FunnelTable.id, publishedVersion: FunnelTable.publishedVersion })
          .from(FunnelTable)
          .where(
            and(
              eq(FunnelTable.workspaceId, Actor.workspace()),
              sql`${FunnelTable.id} IN (${sql.join(
                input.variants.map((v) => sql`${v.funnelId}`),
                sql`, `,
              )})`,
            ),
          )
        for (const funnel of funnelPublishStatus) {
          if (funnel.publishedVersion === null) throw new ExperimentVariantNotPublishedError()
        }

        const experimentId = Identifier.create('experiment')
        const variantRows = input.variants.map((v) => ({
          id: Identifier.create('experiment_variant' as const),
          workspaceId: Actor.workspace(),
          experimentId,
          funnelId: v.funnelId,
          weight: v.weight,
        }))

        const controlVariantId = variantRows.find((v) => v.funnelId === input.controlFunnelId)?.id ?? null

        await tx.insert(ExperimentTable).values({
          id: experimentId,
          workspaceId: Actor.workspace(),
          campaignId: input.campaignId,
          name: input.name,
          startedAt: sql`NOW(3)`,
          controlVariantId,
        })

        await tx.insert(ExperimentVariantTable).values(variantRows)

        return experimentId
      })
    },
  )

  export const getActiveExperiment = fn(Identifier.schema('campaign'), async (campaignId) => {
    return Database.use(async (tx) => {
      const experiment = await tx
        .select()
        .from(ExperimentTable)
        .where(
          and(
            eq(ExperimentTable.workspaceId, Actor.workspace()),
            eq(ExperimentTable.campaignId, campaignId),
            isNotNull(ExperimentTable.startedAt),
            isNull(ExperimentTable.endedAt),
            isNull(ExperimentTable.archivedAt),
          ),
        )
        .then((rows) => rows[0])

      if (!experiment) return null

      const variants = await tx
        .select({
          id: ExperimentVariantTable.id,
          funnelId: ExperimentVariantTable.funnelId,
          funnelTitle: FunnelTable.title,
          weight: ExperimentVariantTable.weight,
        })
        .from(ExperimentVariantTable)
        .innerJoin(
          FunnelTable,
          and(
            eq(FunnelTable.workspaceId, ExperimentVariantTable.workspaceId),
            eq(FunnelTable.id, ExperimentVariantTable.funnelId),
          ),
        )
        .where(
          and(
            eq(ExperimentVariantTable.workspaceId, Actor.workspace()),
            eq(ExperimentVariantTable.experimentId, experiment.id),
          ),
        )

      return {
        id: experiment.id,
        campaignId: experiment.campaignId,
        name: experiment.name,
        status: 'started' as const,
        startedAt: experiment.startedAt,
        createdAt: experiment.createdAt,
        controlVariantId: experiment.controlVariantId,
        winnerVariantId: experiment.winnerVariantId,
        variants: variants.map((variant) => ({
          id: variant.id,
          funnelId: variant.funnelId,
          funnelTitle: variant.funnelTitle,
          weight: variant.weight,
          isControl: variant.id === experiment.controlVariantId,
          isWinner: variant.id === experiment.winnerVariantId,
        })),
      }
    })
  })
}
