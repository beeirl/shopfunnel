import { and, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { QuestionTable } from '../question/index.sql'
import { SubmissionTable } from '../submission/index.sql'
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

      const submissionId = await (async () => {
        const existingId = await Database.use((tx) =>
          tx
            .select({ id: SubmissionTable.id })
            .from(SubmissionTable)
            .where(eq(SubmissionTable.sessionId, input.sessionId))
            .then((rows) => rows[0]?.id),
        )
        if (existingId) return existingId

        await Database.use((tx) =>
          tx
            .insert(SubmissionTable)
            .ignore()
            .values({
              id: Identifier.create('submission'),
              funnelId: input.funnelId,
              workspaceId: Actor.workspaceId(),
              sessionId: input.sessionId,
            }),
        )

        return Database.use((tx) =>
          tx
            .select({ id: SubmissionTable.id })
            .from(SubmissionTable)
            .where(eq(SubmissionTable.sessionId, input.sessionId))
            .then((rows) => rows[0]!.id),
        )
      })()

      const questions = await Database.use((tx) =>
        tx
          .select({ id: QuestionTable.id, blockId: QuestionTable.blockId, type: QuestionTable.type })
          .from(QuestionTable)
          .where(
            and(
              eq(QuestionTable.workspaceId, Actor.workspaceId()),
              eq(QuestionTable.funnelId, input.funnelId),
              isNull(QuestionTable.archivedAt),
            ),
          ),
      )
      const questionByBlockId = new Map(questions.map((q) => [q.blockId, q]))

      const answersWithQuestion = input.answers
        .map((a) => ({
          value: a.value,
          question: questionByBlockId.get(a.blockId),
        }))
        .filter((a): a is typeof a & { question: NonNullable<typeof a.question> } => !!a.question)
      if (answersWithQuestion.length === 0) return

      const questionIds = answersWithQuestion.map((a) => a.question.id)

      await Database.use((tx) =>
        tx
          .insert(AnswerTable)
          .ignore()
          .values(
            answersWithQuestion.map((a) => ({
              id: Identifier.create('answer'),
              workspaceId: Actor.workspaceId(),
              submissionId,
              questionId: a.question.id,
            })),
          ),
      )

      const answers = await Database.use((tx) =>
        tx
          .select({ id: AnswerTable.id, questionId: AnswerTable.questionId })
          .from(AnswerTable)
          .where(
            and(
              eq(AnswerTable.workspaceId, Actor.workspaceId()),
              eq(AnswerTable.submissionId, submissionId),
              inArray(AnswerTable.questionId, questionIds),
            ),
          ),
      )
      const answerIdByQuestionId = new Map(answers.map((a) => [a.questionId, a.id]))
      const answerIds = answers.map((a) => a.id)

      const allAnswerValues: {
        id: string
        workspaceId: string
        answerId: string
        text?: string
        number?: number
        optionId?: string
      }[] = []

      for (const entry of answersWithQuestion) {
        const answerId = answerIdByQuestionId.get(entry.question.id)
        if (!answerId) continue

        const answerValues = (() => {
          if (entry.question.type === 'text_input') {
            return [{ text: String(entry.value ?? '') }]
          }
          if (entry.question.type === 'dropdown' || entry.question.type === 'binary_choice') {
            return [{ optionId: entry.value as string }]
          }
          if (entry.question.type === 'multiple_choice' || entry.question.type === 'picture_choice') {
            const choiceIds = Array.isArray(entry.value) ? (entry.value as string[]) : [entry.value as string]
            return choiceIds.map((choiceId) => ({ optionId: choiceId }))
          }
          return []
        })()

        for (const answerValue of answerValues) {
          allAnswerValues.push({
            id: Identifier.create('answer_value'),
            workspaceId: Actor.workspaceId(),
            answerId,
            ...answerValue,
          })
        }
      }

      if (allAnswerValues.length === 0) return

      if (answerIds.length > 0) {
        await Database.use((tx) =>
          tx
            .delete(AnswerValueTable)
            .where(
              and(eq(AnswerValueTable.workspaceId, Actor.workspaceId()), inArray(AnswerValueTable.answerId, answerIds)),
            ),
        )
      }

      await Database.use((tx) => tx.insert(AnswerValueTable).values(allAnswerValues))
    },
  )
}
