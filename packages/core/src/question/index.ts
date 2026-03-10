import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { Actor } from '../actor'
import { AnswerTable, AnswerValueTable } from '../answer/index.sql'
import { Database } from '../database'
import { FunnelVariantVersionTable } from '../funnel/index.sql'
import { INPUT_BLOCKS, type Block, type InputBlock } from '../funnel/types'
import { Identifier } from '../identifier'
import { fn } from '../utils/fn'
import { QuestionTable } from './index.sql'

export namespace Question {
  export const list = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant'),
    }),
    (input) => {
      return Database.use((tx) =>
        tx
          .select()
          .from(QuestionTable)
          .where(
            and(
              eq(QuestionTable.workspaceId, Actor.workspaceId()),
              eq(QuestionTable.funnelId, input.funnelId),
              eq(QuestionTable.funnelVariantId, input.funnelVariantId),
            ),
          )
          .orderBy(isNotNull(QuestionTable.archivedAt), QuestionTable.index),
      )
    },
  )

  export const sync = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant'),
    }),
    async (input) => {
      await Database.use(async (tx) => {
        const latestVersion = await tx
          .select()
          .from(FunnelVariantVersionTable)
          .where(
            and(
              eq(FunnelVariantVersionTable.workspaceId, Actor.workspaceId()),
              eq(FunnelVariantVersionTable.funnelId, input.funnelId),
              eq(FunnelVariantVersionTable.funnelVariantId, input.funnelVariantId),
            ),
          )
          .orderBy(sql`${FunnelVariantVersionTable.number} DESC`)
          .limit(1)
          .then((rows) => rows[0])
        if (!latestVersion) return

        const existingQuestions = await tx
          .select()
          .from(QuestionTable)
          .where(
            and(
              eq(QuestionTable.workspaceId, Actor.workspaceId()),
              eq(QuestionTable.funnelId, input.funnelId),
              eq(QuestionTable.funnelVariantId, input.funnelVariantId),
              isNull(QuestionTable.archivedAt),
            ),
          )

        const existingQuestionByBlockId = new Map(existingQuestions.map((q) => [q.blockId, q]))

        const answeredOptions = new Map<string, Set<string>>()
        if (existingQuestions.length > 0) {
          const rows = await tx
            .select({
              questionId: AnswerTable.questionId,
              optionId: AnswerValueTable.optionId,
            })
            .from(AnswerValueTable)
            .innerJoin(
              AnswerTable,
              and(
                eq(AnswerValueTable.workspaceId, AnswerTable.workspaceId),
                eq(AnswerValueTable.answerId, AnswerTable.id),
              ),
            )
            .where(
              and(
                eq(AnswerTable.workspaceId, Actor.workspaceId()),
                inArray(
                  AnswerTable.questionId,
                  existingQuestions.map((q) => q.id),
                ),
              ),
            )

          for (const row of rows) {
            if (!row.optionId) continue
            let set = answeredOptions.get(row.questionId)
            if (!set) {
              set = new Set()
              answeredOptions.set(row.questionId, set)
            }
            set.add(row.optionId)
          }
        }

        const inputBlocks = latestVersion.pages.flatMap((page) =>
          page.blocks
            .filter((block): block is Block & { type: InputBlock } => INPUT_BLOCKS.includes(block.type as InputBlock))
            .map((block) => ({
              blockId: block.id,
              blockType: block.type,
              title: block.properties.name,
            })),
        )
        const blockByBlockId = new Map(
          latestVersion.pages.flatMap((page) => page.blocks.map((block) => [block.id, block])),
        )
        const questionsToUpsert = inputBlocks.map((inputBlock, index) => {
          const question = existingQuestionByBlockId.get(inputBlock.blockId)
          const block = blockByBlockId.get(inputBlock.blockId)
          const options =
            block && 'options' in block.properties
              ? (block.properties.options as Array<{ id: string; label: string }>).map((o) => ({
                  id: o.id,
                  label: o.label,
                }))
              : null
          const answeredOptionIds = question ? answeredOptions.get(question.id) : undefined

          let questionOptions: Array<{ id: string; label: string; archived?: boolean }> | undefined
          if (options) {
            const currentIds = new Set(options.map((o) => o.id))

            questionOptions = options.map((o) => ({ id: o.id, label: o.label }))

            if (question?.options && answeredOptionIds) {
              for (const opt of question.options) {
                if (!currentIds.has(opt.id) && answeredOptionIds.has(opt.id)) {
                  questionOptions.push({ id: opt.id, label: opt.label, archived: true })
                }
              }
            }
          }

          return {
            id: question?.id ?? Identifier.create('question'),
            workspaceId: Actor.workspaceId(),
            funnelId: input.funnelId,
            funnelVariantId: input.funnelVariantId,
            blockId: inputBlock.blockId,
            type: inputBlock.blockType,
            title: inputBlock.title,
            index,
            options: questionOptions,
          }
        })

        if (questionsToUpsert.length > 0) {
          await tx
            .insert(QuestionTable)
            .ignore()
            .values(questionsToUpsert)
            .onDuplicateKeyUpdate({
              set: {
                type: sql`VALUES(${QuestionTable.type})`,
                title: sql`VALUES(${QuestionTable.title})`,
                index: sql`VALUES(${QuestionTable.index})`,
                options: sql`VALUES(${QuestionTable.options})`,
              },
            })
        }

        const inputBlockIds = new Set(inputBlocks.map((b) => b.blockId))
        const removedQuestions = existingQuestions.filter((q) => !inputBlockIds.has(q.blockId))
        if (removedQuestions.length > 0) {
          const removedQuestionIds = removedQuestions.map((q) => q.id)

          const answeredQuestions = await tx
            .select({ id: AnswerTable.questionId })
            .from(AnswerTable)
            .where(
              and(
                eq(AnswerTable.workspaceId, Actor.workspaceId()),
                inArray(AnswerTable.questionId, removedQuestionIds),
              ),
            )
            .groupBy(AnswerTable.questionId)

          const answeredQuestionIds = new Set(answeredQuestions.map((q) => q.id))
          const questionIdsToArchive = removedQuestionIds.filter((id) => answeredQuestionIds.has(id))
          const questionIdsToDelete = removedQuestionIds.filter((id) => !answeredQuestionIds.has(id))

          if (questionIdsToArchive.length > 0) {
            await tx
              .update(QuestionTable)
              .set({ archivedAt: sql`NOW(3)` })
              .where(
                and(
                  eq(QuestionTable.workspaceId, Actor.workspaceId()),
                  inArray(QuestionTable.id, questionIdsToArchive),
                ),
              )
          }

          if (questionIdsToDelete.length > 0) {
            await tx
              .delete(QuestionTable)
              .where(
                and(eq(QuestionTable.workspaceId, Actor.workspaceId()), inArray(QuestionTable.id, questionIdsToDelete)),
              )
          }
        }
      })
    },
  )
}
