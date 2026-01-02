import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { QuestionTable } from '../question/index.sql'
import { Quiz } from '../quiz'
import { Submission } from '../submission'
import { fn } from '../utils/fn'
import { AnswerTable, AnswerValueTable } from './index.sql'

export namespace Answer {
  export const submit = fn(
    z.object({
      quizId: Identifier.schema('quiz'),
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

      const quiz = await Quiz.getPublishedVersion(input.quizId)
      if (!quiz) throw new Error('Quiz not found')

      let submissionId = await Submission.fromSessionId(input.sessionId)
      if (!submissionId) {
        submissionId = await Submission.create({
          quizId: quiz.id,
          workspaceId: quiz.workspaceId,
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
              eq(QuestionTable.workspaceId, quiz.workspaceId),
              eq(QuestionTable.quizId, quiz.id),
              isNull(QuestionTable.archivedAt),
            ),
          )

        const blocks = new Map(quiz.steps.flatMap((step) => step.blocks.map((block) => [block.id, block])))
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
                eq(AnswerTable.workspaceId, quiz.workspaceId),
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
                  eq(AnswerValueTable.workspaceId, quiz.workspaceId),
                  eq(AnswerValueTable.answerId, existingAnswer.id),
                ),
              )
          } else {
            answerId = Identifier.create('answer')
            await tx.insert(AnswerTable).values({
              id: answerId,
              workspaceId: quiz.workspaceId,
              submissionId,
              questionId,
            })
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
                workspaceId: quiz.workspaceId,
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
