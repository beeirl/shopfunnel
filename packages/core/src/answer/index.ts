import { and, eq, inArray, isNull } from 'drizzle-orm'
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

      await Database.transaction(async (tx) => {
        let submissionId = await Submission.fromSessionId(input.sessionId)
        if (!submissionId) {
          submissionId = await Submission.create({
            funnelId: funnel.id,
            workspaceId: funnel.workspaceId,
            sessionId: input.sessionId,
          })
        }

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

        const validAnswers = input.answers
          .map((a) => ({
            value: a.value,
            questionId: questionIds.get(a.blockId),
            block: blocks.get(a.blockId),
          }))
          .filter(
            (a): a is typeof a & { questionId: string; block: NonNullable<typeof a.block> } =>
              !!a.questionId && !!a.block,
          )
        if (validAnswers.length === 0) return

        const questionIdsList = validAnswers.map((a) => a.questionId)

        await tx
          .insert(AnswerTable)
          .ignore()
          .values(
            validAnswers.map((a) => ({
              id: Identifier.create('answer'),
              workspaceId: funnel.workspaceId,
              submissionId,
              questionId: a.questionId,
            })),
          )

        const answers = await tx
          .select({ id: AnswerTable.id, questionId: AnswerTable.questionId })
          .from(AnswerTable)
          .where(
            and(
              eq(AnswerTable.workspaceId, funnel.workspaceId),
              eq(AnswerTable.submissionId, submissionId),
              inArray(AnswerTable.questionId, questionIdsList),
            ),
          )
        const answerIdMap = new Map(answers.map((a) => [a.questionId, a.id]))
        const answerIds = answers.map((a) => a.id)

        if (answerIds.length > 0) {
          await tx
            .delete(AnswerValueTable)
            .where(
              and(eq(AnswerValueTable.workspaceId, funnel.workspaceId), inArray(AnswerValueTable.answerId, answerIds)),
            )
        }

        const allValues = []
        for (const answer of validAnswers) {
          const answerId = answerIdMap.get(answer.questionId)
          if (!answerId) continue

          const values = (() => {
            if (answer.block.type === 'text_input') {
              return [{ text: String(answer.value ?? '') }]
            }
            if (answer.block.type === 'dropdown') {
              return [{ optionId: answer.value as string }]
            }
            if (answer.block.type === 'multiple_choice' || answer.block.type === 'picture_choice') {
              const choiceIds = Array.isArray(answer.value) ? (answer.value as string[]) : [answer.value as string]
              return choiceIds.map((choiceId) => ({ optionId: choiceId }))
            }
            return []
          })()

          for (const value of values) {
            allValues.push({
              id: Identifier.create('answer_value'),
              workspaceId: funnel.workspaceId,
              answerId,
              ...value,
            })
          }
        }

        if (allValues.length > 0) {
          await tx.insert(AnswerValueTable).values(allValues)
        }
      })
    },
  )
}
