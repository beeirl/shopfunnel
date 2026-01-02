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
      quizId: Identifier.schema('quiz'),
      workspaceId: Identifier.schema('workspace'),
      sessionId: z.string(),
    }),
    async (input) => {
      const id = Identifier.create('submission')
      await Database.use((tx) =>
        tx.insert(SubmissionTable).values({
          id,
          quizId: input.quizId,
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

  export const list = fn(Identifier.schema('quiz'), async (quizId) => {
    const questions = await Question.list(quizId)

    // Fetch all submissions for this quiz
    const submissions = await Database.use((tx) =>
      tx
        .select()
        .from(SubmissionTable)
        .where(and(eq(SubmissionTable.workspaceId, Actor.workspaceId()), eq(SubmissionTable.quizId, quizId)))
        .orderBy(desc(SubmissionTable.createdAt)),
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
        .where(and(eq(AnswerTable.workspaceId, Actor.workspaceId()), inArray(AnswerTable.submissionId, submissionIds))),
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
        const label = options?.[answer.optionId]?.label ?? answer.optionId
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
          createdAt: s.createdAt,
          completedAt: s.completedAt,
          answers,
        }
      }),
    }
  })
}
