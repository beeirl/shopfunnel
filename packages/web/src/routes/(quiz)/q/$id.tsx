import { Quiz } from '@/components/quiz'
import { Quiz as QuizCore } from '@shopfunnel/core/quiz/index'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const getQuiz = createServerFn()
  .inputValidator(z.object({ shortId: z.string().length(8) }))
  .handler(async ({ data }) => {
    // fromShortId returns undefined if quiz doesn't exist or has no published version
    const quiz = await QuizCore.getPublishedVersion(data.shortId)
    if (!quiz) throw notFound()
    return quiz
  })

const getQuizQueryOptions = (shortId: string) =>
  queryOptions({
    queryKey: ['quiz', 'public', shortId],
    queryFn: () => getQuiz({ data: { shortId } }),
  })

export const Route = createFileRoute('/(quiz)/q/$id')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getQuizQueryOptions(params.id))
  },
})

function RouteComponent() {
  const params = Route.useParams()

  const quizQuery = useSuspenseQuery(getQuizQueryOptions(params.id))
  const quiz = quizQuery.data

  return (
    <div className="flex min-h-dvh flex-col">
      <Quiz quiz={quiz} mode="live" />
    </div>
  )
}
