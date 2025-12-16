import { IconFileText as FileTextIcon, IconPlus as PlusIcon } from '@tabler/icons-react'
import { mutationOptions, queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { Item } from '@/components/ui/item'
import { withActor } from '@/context/auth.withActor'
import { Form } from '@shopfunnel/core/form/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Heading } from './-components/heading'

const listForms = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Form.list(), workspaceId)
  })

const listFormsQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['forms', workspaceId],
    queryFn: () => listForms({ data: workspaceId }),
  })

const createForm = createServerFn({ method: 'POST' })
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Form.create(), workspaceId)
  })

const createFormMutationOptions = (workspaceId: string) =>
  mutationOptions({
    mutationFn: () => createForm({ data: workspaceId }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard/')({
  component: RouteComponent,
  ssr: 'data-only',
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(listFormsQueryOptions(params.workspaceId))
  },
})

function RouteComponent() {
  const params = Route.useParams()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const listFormsQuery = useSuspenseQuery(listFormsQueryOptions(params.workspaceId))
  const forms = listFormsQuery.data ?? []

  const createFormMutation = useMutation(createFormMutationOptions(params.workspaceId))

  async function handleFormCreate() {
    const id = await createFormMutation.mutateAsync()
    queryClient.invalidateQueries(listFormsQueryOptions(params.workspaceId))
    navigate({ to: 'forms/$id/edit', params: { id } })
  }

  if (forms.length === 0) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center">
        <Empty.Root>
          <Empty.Header>
            <Empty.Media variant="icon">
              <FileTextIcon />
            </Empty.Media>
            <Empty.Title>No forms yet</Empty.Title>
            <Empty.Description>Create your first form to get started.</Empty.Description>
          </Empty.Header>
          <Button onClick={handleFormCreate}>Create form</Button>
        </Empty.Root>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Forms</Heading.Title>
        </Heading.Content>
        <Heading.Actions>
          <Button onClick={handleFormCreate}>
            <PlusIcon />
            Create
          </Button>
        </Heading.Actions>
      </Heading.Root>

      <Item.Group>
        {forms.map((form) => (
          <Item.Root
            key={form.id}
            variant="outline"
            render={<Link from={Route.fullPath} to="forms/$id/edit" params={{ id: form.id }} />}
          >
            <Item.Content>
              <Item.Title>{form.title}</Item.Title>
            </Item.Content>
          </Item.Root>
        ))}
      </Item.Group>
    </div>
  )
}
