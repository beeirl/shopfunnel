import { Button } from '@/components/ui/button'
import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Quiz } from '@shopfunnel/core/quiz/index'
import { mutationOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, linkOptions, MatchRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getQuizQueryOptions } from '../-common'

const publishQuiz = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      quizId: Identifier.schema('quiz'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Quiz.publish(data.quizId), data.workspaceId)
  })

const publishQuizMutationOptions = (workspaceId: string, quizId: string) =>
  mutationOptions({
    mutationFn: () => publishQuiz({ data: { workspaceId, quizId } }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/quizzes/$id/_layout')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getQuizQueryOptions(params.workspaceId, params.id))
  },
})

const menuItems = [
  { title: 'Edit', linkOptions: linkOptions({ from: Route.fullPath, to: './edit' }) },
  { title: 'Insights', linkOptions: linkOptions({ from: Route.fullPath, to: './insights' }) },
  { title: 'Responses', linkOptions: linkOptions({ from: Route.fullPath, to: './responses' }) },
]

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const quizQuery = useSuspenseQuery(getQuizQueryOptions(params.workspaceId, params.id))
  const quiz = quizQuery.data

  const publishMutation = useMutation(publishQuizMutationOptions(params.workspaceId, params.id))

  return (
    <div className="flex h-screen w-screen flex-col">
      <div className="grid h-12 w-full shrink-0 grid-cols-3 items-center border-b px-4">
        <div className="flex items-center">
          <span className="truncate text-sm font-medium">Shopfunnel</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          {menuItems.map((item, index) => (
            <MatchRoute key={index} {...item.linkOptions}>
              {(match) => (
                <Button variant={match ? 'secondary' : 'ghost'} render={<Link {...item.linkOptions} />}>
                  {item.title}
                </Button>
              )}
            </MatchRoute>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            aria-label="Preview"
            render={<Link from={Route.fullPath} to="preview" target="_blank" />}
          >
            Preview
          </Button>
          <Button
            variant="ghost"
            aria-label="Share"
            render={<Link to="/q/$id" params={{ id: quiz.shortId }} target="_blank" />}
          >
            Share
          </Button>
          <Button
            disabled={quiz.published || publishMutation.isPending}
            variant={quiz.published ? 'ghost' : 'default'}
            onClick={() => {
              publishMutation.mutate(undefined, {
                onSuccess: () => {
                  queryClient.invalidateQueries(getQuizQueryOptions(params.workspaceId, params.id))
                },
              })
            }}
          >
            Publish
          </Button>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
