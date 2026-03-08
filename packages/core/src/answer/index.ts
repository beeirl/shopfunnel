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

      const validAnswers = input.answers
        .map((a) => ({
          value: a.value,
          question: questionByBlockId.get(a.blockId),
        }))
        .filter((a): a is typeof a & { question: NonNullable<typeof a.question> } => !!a.question)
      if (validAnswers.length === 0) return

      const questionIdsList = validAnswers.map((a) => a.question.id)

      await Database.use((tx) =>
        tx
          .insert(AnswerTable)
          .ignore()
          .values(
            validAnswers.map((a) => ({
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
              inArray(AnswerTable.questionId, questionIdsList),
            ),
          ),
      )
      const answerIdMap = new Map(answers.map((a) => [a.questionId, a.id]))
      const answerIds = answers.map((a) => a.id)

      const allValues: {
        id: string
        workspaceId: string
        answerId: string
        text?: string
        number?: number
        optionId?: string
      }[] = []

      for (const answer of validAnswers) {
        const answerId = answerIdMap.get(answer.question.id)
        if (!answerId) continue

        if (answer.question.type === 'text_input') {
          allValues.push({
            id: Identifier.create('answer_value'),
            workspaceId: Actor.workspaceId(),
            answerId,
            text: String(answer.value ?? ''),
          })
        } else if (answer.question.type === 'dropdown') {
          allValues.push({
            id: Identifier.create('answer_value'),
            workspaceId: Actor.workspaceId(),
            answerId,
            optionId: answer.value as string,
          })
        } else if (answer.question.type === 'multiple_choice' || answer.question.type === 'picture_choice') {
          const choiceIds = Array.isArray(answer.value) ? (answer.value as string[]) : [answer.value as string]
          for (const choiceId of choiceIds) {
            allValues.push({
              id: Identifier.create('answer_value'),
              workspaceId: Actor.workspaceId(),
              answerId,
              optionId: choiceId,
            })
          }
        }
      }

      if (allValues.length === 0) return

      if (answerIds.length > 0) {
        await Database.use((tx) =>
          tx
            .delete(AnswerValueTable)
            .where(
              and(eq(AnswerValueTable.workspaceId, Actor.workspaceId()), inArray(AnswerValueTable.answerId, answerIds)),
            ),
        )
      }

      await Database.use((tx) => tx.insert(AnswerValueTable).values(allValues))
    },
  )
}
