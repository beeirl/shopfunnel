import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { Database } from '../database'
import { Funnel } from '../funnel'
import { Identifier } from '../identifier'
import { QuestionTable } from '../question/index.sql'
import { Submission } from '../submission'
import { fn } from '../utils/fn'
import { AnswerTable, AnswerValueTable } from './index.sql'

export namespace Answer {
  export const submit = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      sessionId: z.string(),
      answers: z.array(
        z.object({
          blockId: z.string(),
          value: z.unknown(),
        }),
      ),
    }),
    async (input) => {
      if (input.answers.length === 0) return

      const funnel = await Funnel.getPublishedVersion(input.funnelId)
      if (!funnel) throw new Error('Funnel not found')

      let submissionId = await Submission.fromSessionId(input.sessionId)
      if (!submissionId) {
        submissionId = await Submission.create({
          funnelId: funnel.id,
          workspaceId: funnel.workspaceId,
          sessionId: input.sessionId,
        })
      }

      await Database.use(async (tx) => {
        // Resolve blockIds to questionIds
        const questions = await tx
          .select({ id: QuestionTable.id, blockId: QuestionTable.blockId })
          .from(QuestionTable)
          .where(
            and(
              eq(QuestionTable.workspaceId, funnel.workspaceId),
              eq(QuestionTable.funnelId, funnel.id),
              isNull(QuestionTable.archivedAt),
            ),
          )

        const blocks = new Map(funnel.pages.flatMap((page) => page.blocks.map((block) => [block.id, block])))
        const questionIds = new Map(questions.map((q) => [q.blockId, q.id]))

        for (const answer of input.answers) {
          const questionId = questionIds.get(answer.blockId)
          if (!questionId) continue

          const block = blocks.get(answer.blockId)
          if (!block) continue

          // Check for existing answer
          const existingAnswer = await tx
            .select({ id: AnswerTable.id })
            .from(AnswerTable)
            .where(
              and(
                eq(AnswerTable.workspaceId, funnel.workspaceId),
                eq(AnswerTable.submissionId, submissionId),
                eq(AnswerTable.questionId, questionId),
              ),
            )
            .then((rows) => rows[0])

          let answerId: string

          if (existingAnswer) {
            answerId = existingAnswer.id
            // Delete existing values before inserting new ones
            await tx
              .delete(AnswerValueTable)
              .where(
                and(
                  eq(AnswerValueTable.workspaceId, funnel.workspaceId),
                  eq(AnswerValueTable.answerId, existingAnswer.id),
                ),
              )
          } else {
            try {
              answerId = Identifier.create('answer')
              await tx.insert(AnswerTable).values({
                id: answerId,
                workspaceId: funnel.workspaceId,
                submissionId,
                questionId,
              })
            } catch {
              continue
            }
          }

          const values = (() => {
            if (block.type === 'text_input') {
              return [{ text: String(answer.value ?? '') }]
            }
            if (block.type === 'dropdown') {
              const choiceId = answer.value as string
              return [{ optionId: choiceId }]
            }
            if (block.type === 'multiple_choice' || block.type === 'picture_choice') {
              const choiceIds = Array.isArray(answer.value) ? (answer.value as string[]) : [answer.value as string]
              return choiceIds.map((choiceId) => {
                return { optionId: choiceId }
              })
            }
            return []
          })()

          if (values.length > 0) {
            await tx.insert(AnswerValueTable).values(
              values.map((value) => ({
                id: Identifier.create('answer_value'),
                workspaceId: funnel.workspaceId,
                answerId,
                ...value,
              })),
            )
          }
        }
      })
    },
  )
}
