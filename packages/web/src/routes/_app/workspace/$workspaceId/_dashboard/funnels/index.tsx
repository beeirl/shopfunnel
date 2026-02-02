import { DataGrid } from '@/components/data-grid'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Menu } from '@/components/ui/menu'
import { Tooltip } from '@/components/ui/tooltip'
import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import {
  IconCopy as CopyIcon,
  IconDots as DotsIcon,
  IconFileText as FileTextIcon,
  IconLoader2 as LoaderIcon,
  IconShare3 as ShareIcon,
  IconTrash as TrashIcon,
} from '@tabler/icons-react'
import { mutationOptions, queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { DateTime } from 'luxon'
import * as React from 'react'
import { z } from 'zod'
import { Heading } from '../-components/heading'
import { getSessionQueryOptions } from '../../-common'

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

const duplicateFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      id: Identifier.schema('funnel'),
      title: z.string().optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.duplicate({ id: data.id, title: data.title }), data.workspaceId)
  })

const removeFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      id: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.remove(data.id), data.workspaceId)
  })

const removeFunnelMutationOptions = (workspaceId: string) =>
  mutationOptions({
    mutationFn: (id: string) => removeFunnel({ data: { workspaceId, id } }),
  })

const deleteDialogHandle = AlertDialog.createHandle<{ id: string; title: string }>()

export const Route = createFileRoute('/_app/workspace/$workspaceId/_dashboard/funnels/')({
  staticData: { title: 'Funnels' },
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(listFunnelsQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId)),
    ])
  },
})

function DuplicateFunnelDialog({
  open,
  onOpenChange,
  funnel,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  funnel: { id: string; title: string } | null
  onSuccess: () => void
}) {
  const params = Route.useParams()
  const [title, setTitle] = React.useState('')

  const duplicateFunnelMutation = useMutation({
    mutationFn: (data: { id: string; title?: string }) =>
      duplicateFunnel({ data: { workspaceId: params.workspaceId, ...data } }),
    onSuccess: () => {
      onSuccess()
      onOpenChange(false)
    },
  })

  const handleDuplicate = () => {
    if (!funnel) return
    duplicateFunnelMutation.mutate({
      id: funnel.id,
      title: title.trim() || undefined,
    })
  }

  React.useEffect(() => {
    if (open && funnel) {
      setTitle(`${funnel.title} copy`)
    }
  }, [open, funnel])

  React.useEffect(() => {
    if (!open) {
      setTitle('')
    }
  }, [open])

  if (!funnel) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Duplicate Funnel</Dialog.Title>
          <Dialog.Description>Enter a name for the duplicated funnel.</Dialog.Description>
        </Dialog.Header>

        <Input placeholder={`${funnel.title} copy`} value={title} onValueChange={setTitle} />

        <Dialog.Footer>
          <Button onClick={handleDuplicate} disabled={duplicateFunnelMutation.isPending}>
            Duplicate
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function RouteComponent() {
  const params = Route.useParams()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const listFunnelsQuery = useSuspenseQuery(listFunnelsQueryOptions(params.workspaceId))
  const funnels = listFunnelsQuery.data ?? []

  const sessionQuery = useSuspenseQuery(getSessionQueryOptions(params.workspaceId))
  const isAdmin = sessionQuery.data.isAdmin

  const createFunnelMutation = useMutation(createFunnelMutationOptions(params.workspaceId))
  const removeFunnelMutation = useMutation(removeFunnelMutationOptions(params.workspaceId))

  const [isCreating, setIsCreating] = React.useState(false)
  const [isRemoving, setIsRemoving] = React.useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = React.useState(false)
  const [selectedFunnel, setSelectedFunnel] = React.useState<{ id: string; title: string } | null>(null)

  async function handleFunnelCreate() {
    setIsCreating(true)
    try {
      const id = await createFunnelMutation.mutateAsync()
      await navigate({
        to: '/workspace/$workspaceId/funnels/$id/edit',
        params: { workspaceId: params.workspaceId, id },
      })
      queryClient.invalidateQueries(listFunnelsQueryOptions(params.workspaceId))
    } catch {
      setIsCreating(false)
    }
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
          {isAdmin && (
            <Button onClick={handleFunnelCreate} disabled={isCreating}>
              {isCreating && <LoaderIcon className="animate-spin" />}
              Create funnel
            </Button>
          )}
        </Empty.Root>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full max-w-6xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Funnels</Heading.Title>
        </Heading.Content>
        {isAdmin && (
          <Heading.Actions>
            <Button size="lg" onClick={handleFunnelCreate} disabled={isCreating}>
              {isCreating && <LoaderIcon className="animate-spin" />}
              Create a Funnel
            </Button>
          </Heading.Actions>
        )}
      </Heading.Root>
      <DataGrid.Root className="grid-cols-[1fr_min-content] md:grid-cols-[auto_120px_120px_100px]">
        <DataGrid.Header>
          <DataGrid.Head>Name</DataGrid.Head>
          <DataGrid.Head hideOnMobile>Edited</DataGrid.Head>
          <DataGrid.Head hideOnMobile>Created</DataGrid.Head>
          <DataGrid.Head srOnly>Actions</DataGrid.Head>
        </DataGrid.Header>

        <DataGrid.Body>
          {funnels.map((funnel) => (
            <DataGrid.Row
              key={funnel.id}
              render={
                <Link
                  to="/workspace/$workspaceId/funnels/$id/edit"
                  params={{ workspaceId: params.workspaceId, id: funnel.id }}
                />
              }
            >
              <DataGrid.Cell className="flex-col items-start justify-center overflow-hidden pr-2 md:pr-8">
                <span className="truncate text-sm font-medium text-foreground">{funnel.title}</span>
                <span className="truncate text-xs text-muted-foreground md:hidden">
                  {DateTime.fromJSDate(funnel.createdAt).toRelative()}
                </span>
              </DataGrid.Cell>

              <DataGrid.Cell hideOnMobile>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<span className="text-sm text-muted-foreground" />}>
                    {DateTime.fromJSDate(funnel.updatedAt).toRelative()}
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {DateTime.fromJSDate(funnel.updatedAt).toLocaleString(DateTime.DATETIME_MED)}
                  </Tooltip.Content>
                </Tooltip.Root>
              </DataGrid.Cell>

              <DataGrid.Cell hideOnMobile>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<span className="text-sm text-muted-foreground" />}>
                    {DateTime.fromJSDate(funnel.createdAt).toRelative()}
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {DateTime.fromJSDate(funnel.createdAt).toLocaleString(DateTime.DATETIME_MED)}
                  </Tooltip.Content>
                </Tooltip.Root>
              </DataGrid.Cell>

              <DataGrid.Cell className="relative z-10 shrink-0 justify-end gap-1">
                <Menu.Root>
                  <Menu.Trigger render={<Button size="icon-sm" variant="ghost" />} onClick={(e) => e.preventDefault()}>
                    <DotsIcon className="text-muted-foreground" />
                  </Menu.Trigger>
                  <Menu.Content align="end">
                    <Menu.Item
                      onClick={(e) => e.stopPropagation()}
                      render={
                        <a href={funnel.url} target="_blank" rel="noopener noreferrer">
                          <ShareIcon />
                          Share
                        </a>
                      }
                    />
                    {isAdmin && (
                      <Menu.Item
                        onClick={(e) => {
                          e.preventDefault()
                          setSelectedFunnel({ id: funnel.id, title: funnel.title })
                          setDuplicateDialogOpen(true)
                        }}
                      >
                        <CopyIcon />
                        Duplicate
                      </Menu.Item>
                    )}
                    {isAdmin && (
                      <Menu.Item
                        variant="destructive"
                        onClick={(e) => {
                          e.preventDefault()
                          deleteDialogHandle.openWithPayload({ id: funnel.id, title: funnel.title })
                        }}
                      >
                        <TrashIcon />
                        Delete
                      </Menu.Item>
                    )}
                  </Menu.Content>
                </Menu.Root>
              </DataGrid.Cell>
            </DataGrid.Row>
          ))}
        </DataGrid.Body>
      </DataGrid.Root>

      <DuplicateFunnelDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        funnel={selectedFunnel}
        onSuccess={() => queryClient.invalidateQueries(listFunnelsQueryOptions(params.workspaceId))}
      />

      <AlertDialog.Root handle={deleteDialogHandle}>
        {({ payload }) => (
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Delete funnel</AlertDialog.Title>
              <AlertDialog.Description>
                Are you sure you want to delete &ldquo;{payload?.title}&rdquo;?
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={isRemoving}>Cancel</AlertDialog.Cancel>
              <Button
                variant="destructive"
                disabled={isRemoving}
                onClick={async () => {
                  if (!payload) return
                  setIsRemoving(true)
                  await removeFunnelMutation.mutateAsync(payload.id)
                  await queryClient.invalidateQueries(listFunnelsQueryOptions(params.workspaceId))
                  setIsRemoving(false)
                  deleteDialogHandle.close()
                }}
              >
                {isRemoving && <LoaderIcon className="animate-spin" />}
                Delete
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        )}
      </AlertDialog.Root>
    </div>
  )
}
