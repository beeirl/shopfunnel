import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { Actor } from '../actor'
import { AnswerTable, AnswerValueTable } from '../answer/index.sql'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { Quiz } from '../quiz'
import { INPUT_BLOCKS, type Block, type InputBlock } from '../quiz/types'
import { fn } from '../utils/fn'
import { QuestionTable } from './index.sql'

export namespace Question {
  export const sync = fn(
    z.object({
      quizId: Identifier.schema('quiz'),
    }),
    async (input) => {
      await Database.use(async (tx) => {
        const quiz = await Quiz.getCurrentVersion(input.quizId)

        // Get existing non-archived questions for this quiz
        const existingQuestions = await tx
          .select()
          .from(QuestionTable)
          .where(
            and(
              eq(QuestionTable.workspaceId, Actor.workspaceId()),
              eq(QuestionTable.quizId, input.quizId),
              isNull(QuestionTable.archivedAt),
            ),
          )

        const existingQuestionByBlockId = new Map(existingQuestions.map((q) => [q.blockId, q]))

        // Batch-fetch answered option IDs for all existing questions
        const answeredOptions = new Map<string, Set<string>>()
        if (existingQuestions.length > 0) {
          const rows = await tx
            .select({
              questionId: AnswerTable.questionId,
              optionId: AnswerValueTable.optionId,
            })
            .from(AnswerValueTable)
            .innerJoin(AnswerTable, eq(AnswerValueTable.answerId, AnswerTable.id))
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

        const inputBlocks = quiz.steps.flatMap((step) =>
          step.blocks
            .filter((block): block is Block & { type: InputBlock } => INPUT_BLOCKS.includes(block.type as InputBlock))
            .map((block) => ({
              blockId: block.id,
              blockType: block.type,
              title: block.properties.name,
            })),
        )
        const blockByBlockId = new Map(quiz.steps.flatMap((step) => step.blocks.map((block) => [block.id, block])))
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

          let questionOptions: Record<string, { id: string; label: string; index: number }> | undefined
          if (options) {
            questionOptions = {}
            const currentIds = new Set(options.map((o) => o.id))

            // Add current options with index
            options.forEach((opt, i) => {
              questionOptions![opt.id] = { id: opt.id, label: opt.label, index: i }
            })

            // Keep removed options that have answers
            if (question?.options && answeredOptionIds) {
              for (const [id, value] of Object.entries(question.options)) {
                if (!currentIds.has(id) && answeredOptionIds.has(id)) {
                  questionOptions[id] = value
                }
              }
            }
          }

          return {
            id: question?.id ?? Identifier.create('question'),
            workspaceId: Actor.workspaceId(),
            quizId: input.quizId,
            blockId: inputBlock.blockId,
            blockType: inputBlock.blockType,
            title: inputBlock.title,
            index,
            options: questionOptions,
          }
        })

        // Batch upsert all questions
        if (questionsToUpsert.length > 0) {
          await tx
            .insert(QuestionTable)
            .ignore()
            .values(questionsToUpsert)
            .onDuplicateKeyUpdate({
              set: {
                title: sql`VALUES(${QuestionTable.title})`,
                blockType: sql`VALUES(${QuestionTable.blockType})`,
                index: sql`VALUES(${QuestionTable.index})`,
                options: sql`VALUES(${QuestionTable.options})`,
              },
            })
        }

        // Handle questions that are no longer in the current version
        const inputBlockIds = new Set(inputBlocks.map((b) => b.blockId))
        const removedQuestions = existingQuestions.filter((q) => !inputBlockIds.has(q.blockId))
        if (removedQuestions.length > 0) {
          const removedQuestionIds = removedQuestions.map((q) => q.id)

          // Batch check which have answers
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

          // Batch archive questions with answers
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

          // Batch delete questions without answers
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

  export const list = fn(Identifier.schema('quiz'), (quizId) => {
    return Database.use((tx) =>
      tx
        .select()
        .from(QuestionTable)
        .where(and(eq(QuestionTable.workspaceId, Actor.workspaceId()), eq(QuestionTable.quizId, quizId)))
        .orderBy(isNotNull(QuestionTable.archivedAt), QuestionTable.index),
    )
  })
}
