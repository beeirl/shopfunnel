import { IconFileText as FileTextIcon, IconPlus as PlusIcon } from '@tabler/icons-react'
import { mutationOptions, queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { Item } from '@/components/ui/item'
import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { getSessionQueryOptions } from '../-common'
import { Heading } from './-components/heading'

const listFunnels = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Funnel.list(), workspaceId)
  })

const listFunnelsQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['funnels', workspaceId],
    queryFn: () => listFunnels({ data: workspaceId }),
  })

const createFunnel = createServerFn({ method: 'POST' })
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Funnel.create(), workspaceId)
  })

const createFunnelMutationOptions = (workspaceId: string) =>
  mutationOptions({
    mutationFn: () => createFunnel({ data: workspaceId }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard/')({
  component: RouteComponent,
  ssr: false,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(listFunnelsQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId)),
    ])
  },
})

function RouteComponent() {
  const params = Route.useParams()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const listFunnelsQuery = useSuspenseQuery(listFunnelsQueryOptions(params.workspaceId))
  const funnels = listFunnelsQuery.data ?? []

  const sessionQuery = useSuspenseQuery(getSessionQueryOptions(params.workspaceId))
  const isAdmin = sessionQuery.data.isAdmin

  const createFunnelMutation = useMutation(createFunnelMutationOptions(params.workspaceId))

  async function handleFunnelCreate() {
    const id = await createFunnelMutation.mutateAsync()
    await navigate({ to: 'funnels/$id/edit', params: { id } })
    queryClient.invalidateQueries(listFunnelsQueryOptions(params.workspaceId))
  }

  if (funnels.length === 0) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center">
        <Empty.Root>
          <Empty.Header>
            <Empty.Media variant="icon">
              <FileTextIcon />
            </Empty.Media>
            <Empty.Title>No funnels yet</Empty.Title>
            {isAdmin && <Empty.Description>Create your first funnel to get started.</Empty.Description>}
          </Empty.Header>
          {isAdmin && <Button onClick={handleFunnelCreate}>Create funnel</Button>}
        </Empty.Root>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Funnels</Heading.Title>
        </Heading.Content>
        {isAdmin && (
          <Heading.Actions>
            <Button onClick={handleFunnelCreate}>
              <PlusIcon />
              Create funnel
            </Button>
          </Heading.Actions>
        )}
      </Heading.Root>
      <Item.Group>
        {funnels.map((funnel) => (
          <Item.Root
            key={funnel.id}
            size="xs"
            variant="outline"
            render={<Link from={Route.fullPath} to="funnels/$id/edit" params={{ id: funnel.id }} />}
          >
            <Item.Content>
              <Item.Title>{funnel.title}</Item.Title>
            </Item.Content>
          </Item.Root>
        ))}
      </Item.Group>
    </div>
  )
}
