import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { Actor } from '../actor'
import { AnswerTable, AnswerValueTable } from '../answer/index.sql'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { Question } from '../question'
import { fn } from '../utils/fn'
import { SubmissionTable } from './index.sql'

export namespace Submission {
  export const create = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      workspaceId: Identifier.schema('workspace'),
      sessionId: z.string(),
    }),
    async (input) => {
      const id = Identifier.create('submission')
      await Database.use((tx) =>
        tx.insert(SubmissionTable).values({
          id,
          funnelId: input.funnelId,
          workspaceId: input.workspaceId,
          sessionId: input.sessionId,
        }),
      )
      return id
    },
  )

  export const fromSessionId = fn(z.string(), async (sessionId) =>
    Database.use((tx) =>
      tx
        .select({ id: SubmissionTable.id })
        .from(SubmissionTable)
        .where(eq(SubmissionTable.sessionId, sessionId))
        .then((rows) => rows[0]?.id),
    ),
  )

  export const complete = fn(Identifier.schema('submission'), async (id) => {
    await Database.use((tx) =>
      tx
        .update(SubmissionTable)
        .set({ completedAt: sql`NOW(3)` })
        .where(eq(SubmissionTable.id, id)),
    )
  })

  export const list = fn(
    z.object({
      funnelId: Identifier.schema('funnel'),
      page: z.number().int().positive().default(1),
      limit: z.number().int().min(1).max(100).default(50),
    }),
    async (input) => {
      const { funnelId, page, limit } = input
      const offset = (page - 1) * limit

      const questions = await Question.list(funnelId)

      // Get total count
      const countResult = await Database.use((tx) =>
        tx
          .select({ count: sql<number>`COUNT(*)` })
          .from(SubmissionTable)
          .where(and(eq(SubmissionTable.workspaceId, Actor.workspaceId()), eq(SubmissionTable.funnelId, funnelId))),
      )
      const total = countResult[0]?.count ?? 0

      const totalPages = Math.ceil(total / limit)

      // Fetch paginated submissions for this funnel
      const submissions = await Database.use((tx) =>
        tx
          .select()
          .from(SubmissionTable)
          .where(and(eq(SubmissionTable.workspaceId, Actor.workspaceId()), eq(SubmissionTable.funnelId, funnelId)))
          .orderBy(desc(SubmissionTable.updatedAt))
          .limit(limit)
          .offset(offset),
      )

      if (submissions.length === 0) {
        return {
          questions: questions.map((q) => ({
            id: q.id,
            title: q.title,
            index: q.index,
            options: q.options,
          })),
          submissions: [],
          total,
          page,
          limit,
          totalPages,
        }
      }

      // Fetch all answers for these submissions
      const submissionIds = submissions.map((s) => s.id)
      const answers = await Database.use((tx) =>
        tx
          .select({
            submissionId: AnswerTable.submissionId,
            questionId: AnswerTable.questionId,
            text: AnswerValueTable.text,
            number: AnswerValueTable.number,
            optionId: AnswerValueTable.optionId,
          })
          .from(AnswerTable)
          .innerJoin(AnswerValueTable, eq(AnswerValueTable.answerId, AnswerTable.id))
          .where(
            and(eq(AnswerTable.workspaceId, Actor.workspaceId()), inArray(AnswerTable.submissionId, submissionIds)),
          ),
      )

      // Build a map of questionId -> options for label resolution
      const questionOptionByQuestionId = new Map(questions.map((q) => [q.id, q.options]))

      // Group answers by submission
      const answersBySubmission = new Map<string, Map<string, string[]>>()
      for (const answer of answers) {
        let submissionAnswers = answersBySubmission.get(answer.submissionId)
        if (!submissionAnswers) {
          submissionAnswers = new Map()
          answersBySubmission.set(answer.submissionId, submissionAnswers)
        }

        let questionAnswers = submissionAnswers.get(answer.questionId)
        if (!questionAnswers) {
          questionAnswers = []
          submissionAnswers.set(answer.questionId, questionAnswers)
        }

        // Resolve the answer value
        if (answer.text !== null) {
          questionAnswers.push(answer.text)
        } else if (answer.optionId !== null) {
          const options = questionOptionByQuestionId.get(answer.questionId)
          const label = options?.find((o) => o.id === answer.optionId)?.label ?? answer.optionId
          questionAnswers.push(label)
        } else if (answer.number !== null) {
          questionAnswers.push(String(answer.number))
        }
      }

      return {
        questions: questions.map((q) => ({
          id: q.id,
          title: q.title,
          index: q.index,
          options: q.options,
        })),
        submissions: submissions.map((s) => {
          const submissionAnswers = answersBySubmission.get(s.id)
          const answers: Record<string, string[]> = {}
          if (submissionAnswers) {
            for (const [questionId, values] of submissionAnswers) {
              answers[questionId] = values
            }
          }
          return {
            id: s.id,
            updatedAt: s.updatedAt,
            answers,
          }
        }),
        total,
        page,
        limit,
        totalPages,
      }
    },
  )
}
