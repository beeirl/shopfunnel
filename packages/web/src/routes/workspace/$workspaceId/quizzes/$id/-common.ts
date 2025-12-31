import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Quiz } from '@shopfunnel/core/quiz/index'
import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getQuiz = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      quizId: Identifier.schema('quiz'),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      const quiz = await Quiz.getCurrentVersion(data.quizId)
      if (!quiz) throw notFound()
      return quiz
    }, data.workspaceId)
  })

export const getQuizQueryOptions = (workspaceId: string, quizId: string) =>
  queryOptions({
    queryKey: ['quiz', workspaceId, quizId],
    queryFn: () => getQuiz({ data: { workspaceId, quizId } }),
  })
