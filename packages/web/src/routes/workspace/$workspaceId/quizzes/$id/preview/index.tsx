import { Quiz } from '@/components/quiz'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getQuizQueryOptions } from '../-common'

export const Route = createFileRoute('/workspace/$workspaceId/quizzes/$id/preview/')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getQuizQueryOptions(params.workspaceId, params.id))
  },
})

function RouteComponent() {
  const params = Route.useParams()

  const quizQuery = useSuspenseQuery(getQuizQueryOptions(params.workspaceId, params.id))
  const quiz = quizQuery.data

  return <Quiz quiz={quiz} mode="preview" />
}
