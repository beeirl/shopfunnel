import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { Lead } from '../lead'
import { QuestionTable } from '../question/index.sql'
import { SubmissionTable } from '../submission/index.sql'
import { fn } from '../utils/fn'
import { AnswerTable, type AnswerValue } from './index.sql'

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

      const blockIds = Array.from(new Set(input.answers.map((answer) => answer.blockId)))

      const questions = await Database.use((tx) =>
        tx
          .select({ id: QuestionTable.id, blockId: QuestionTable.blockId, type: QuestionTable.type })
          .from(QuestionTable)
          .where(
            and(
              eq(QuestionTable.workspaceId, Actor.workspaceId()),
              eq(QuestionTable.funnelId, input.funnelId),
              inArray(QuestionTable.blockId, blockIds),
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

      const answersToUpsert = answersWithQuestion
        .map((entry) => {
          const value = (() => {
            if (
              entry.question.type === 'text_input' ||
              entry.question.type === 'email' ||
              entry.question.type === 'phone_number'
            ) {
              return String(entry.value ?? '') as AnswerValue
            }
            if (entry.question.type === 'dropdown' || entry.question.type === 'binary_choice') {
              return String(entry.value ?? '') as AnswerValue
            }
            if (entry.question.type === 'multiple_choice' || entry.question.type === 'picture_choice') {
              const choiceIds = Array.isArray(entry.value) ? entry.value : [entry.value]
              return choiceIds.map((choiceId) => String(choiceId)) as AnswerValue
            }
            return null
          })()
          if (value === null) return null

          return {
            id: Identifier.create('answer'),
            workspaceId: Actor.workspaceId(),
            submissionId,
            questionId: entry.question.id,
            value,
          }
        })
        .filter((answer): answer is NonNullable<typeof answer> => answer !== null)
      if (answersToUpsert.length === 0) return

      await Database.use((tx) =>
        tx
          .insert(AnswerTable)
          .values(answersToUpsert)
          .onDuplicateKeyUpdate({
            set: {
              value: sql`VALUES(${AnswerTable.value})`,
            },
          }),
      )

      let email: string | undefined
      let phone: string | undefined
      for (const a of answersWithQuestion) {
        if (a.question.type === 'email') {
          const value = String(a.value ?? '').trim()
          email = value || undefined
        }
        if (a.question.type === 'phone_number') {
          const value = String(a.value ?? '').trim()
          phone = value || undefined
        }
      }
      if (email !== undefined || phone !== undefined) {
        await Lead.upsert({ submissionId, email, phone })
      }
    },
  )
}
