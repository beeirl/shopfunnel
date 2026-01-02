import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Quiz } from '@shopfunnel/core/quiz/index'
import { IconChevronLeft as ChevronLeftIcon } from '@tabler/icons-react'
import { mutationOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, linkOptions, MatchRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
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

const updateQuizTitle = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      quizId: Identifier.schema('quiz'),
      title: z.string().min(1).max(255),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Quiz.updateTitle({ id: data.quizId, title: data.title }), data.workspaceId)
  })

const updateQuizTitleMutationOptions = (workspaceId: string, quizId: string) =>
  mutationOptions({
    mutationFn: (title: string) => updateQuizTitle({ data: { workspaceId, quizId, title } }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/quizzes/$id/_layout')({
  component: RouteComponent,
  ssr: false,
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
  const updateTitleMutation = useMutation(updateQuizTitleMutationOptions(params.workspaceId, params.id))

  const [editTitleOpen, setEditTitleOpen] = React.useState(false)
  const [titleValue, setTitleValue] = React.useState(quiz.title)
  const [titleError, setTitleError] = React.useState<string | null>(null)

  const handleTitleOpenChange = (open: boolean) => {
    setEditTitleOpen(open)
    if (open) {
      setTitleValue(quiz.title)
      setTitleError(null)
    }
  }

  const handleTitleSave = () => {
    const trimmedTitle = titleValue.trim()
    if (!trimmedTitle) {
      setTitleError('Title cannot be empty')
      return
    }
    updateTitleMutation.mutate(trimmedTitle, {
      onSuccess: () => {
        queryClient.invalidateQueries(getQuizQueryOptions(params.workspaceId, params.id))
        setEditTitleOpen(false)
      },
    })
  }

  return (
    <div className="flex h-screen w-screen flex-col">
      <div className="grid h-12 w-full shrink-0 grid-cols-3 items-center border-b pr-4 pl-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to dashboard"
            render={<Link from={Route.fullPath} to="../.." />}
          >
            <ChevronLeftIcon />
          </Button>
          <div className="h-3 w-px rounded-full bg-border" />
          <Dialog.Root open={editTitleOpen} onOpenChange={handleTitleOpenChange}>
            <Dialog.Trigger aria-label="Edit quiz title" render={<Button variant="ghost">{quiz.title}</Button>} />
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Edit Quiz Title</Dialog.Title>
              </Dialog.Header>
              <Field.Root data-invalid={!!titleError}>
                <Field.Label>Title</Field.Label>
                <Input
                  autoFocus
                  placeholder="Enter quiz title"
                  value={titleValue}
                  onValueChange={(value) => {
                    setTitleValue(value)
                    if (titleError) setTitleError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleTitleSave()
                    }
                  }}
                />
                {titleError && <Field.Error>{titleError}</Field.Error>}
              </Field.Root>
              <Dialog.Footer>
                <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
                <Button onClick={handleTitleSave} disabled={updateTitleMutation.isPending}>
                  {updateTitleMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Root>
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
