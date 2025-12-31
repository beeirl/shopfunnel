import { IconFileText as FileTextIcon, IconPlus as PlusIcon } from '@tabler/icons-react'
import { mutationOptions, queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { Item } from '@/components/ui/item'
import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Quiz } from '@shopfunnel/core/quiz/index'
import { Heading } from './-components/heading'

const listQuizzes = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Quiz.list(), workspaceId)
  })

const listQuizzesQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['quizzes', workspaceId],
    queryFn: () => listQuizzes({ data: workspaceId }),
  })

const createQuiz = createServerFn({ method: 'POST' })
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Quiz.create(), workspaceId)
  })

const createQuizMutationOptions = (workspaceId: string) =>
  mutationOptions({
    mutationFn: () => createQuiz({ data: workspaceId }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard/')({
  component: RouteComponent,
  ssr: false,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(listQuizzesQueryOptions(params.workspaceId))
  },
})

function RouteComponent() {
  const params = Route.useParams()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const listQuizzesQuery = useSuspenseQuery(listQuizzesQueryOptions(params.workspaceId))
  const quizzes = listQuizzesQuery.data ?? []

  const createQuizMutation = useMutation(createQuizMutationOptions(params.workspaceId))

  async function handleQuizCreate() {
    const id = await createQuizMutation.mutateAsync()
    await navigate({ to: 'quizzes/$id/edit', params: { id } })
    queryClient.invalidateQueries(listQuizzesQueryOptions(params.workspaceId))
  }

  if (quizzes.length === 0) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center">
        <Empty.Root>
          <Empty.Header>
            <Empty.Media variant="icon">
              <FileTextIcon />
            </Empty.Media>
            <Empty.Title>No quizzes yet</Empty.Title>
            <Empty.Description>Create your first quiz to get started.</Empty.Description>
          </Empty.Header>
          <Button onClick={handleQuizCreate}>Create quiz</Button>
        </Empty.Root>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Quizzes</Heading.Title>
        </Heading.Content>
        <Heading.Actions>
          <Button onClick={handleQuizCreate}>
            <PlusIcon />
            Create
          </Button>
        </Heading.Actions>
      </Heading.Root>

      <Item.Group>
        {quizzes.map((quiz) => (
          <Item.Root
            key={quiz.id}
            variant="outline"
            render={<Link from={Route.fullPath} to="quizzes/$id/edit" params={{ id: quiz.id }} />}
          >
            <Item.Content>
              <Item.Title>{quiz.title}</Item.Title>
            </Item.Content>
          </Item.Root>
        ))}
      </Item.Group>
    </div>
  )
}
