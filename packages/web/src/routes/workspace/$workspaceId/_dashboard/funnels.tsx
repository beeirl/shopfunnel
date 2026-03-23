import { DataGrid } from '@/components/data-grid'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Menu } from '@/components/ui/menu'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip } from '@/components/ui/tooltip'
import { withActor } from '@/context/auth.withActor'
import { Campaign } from '@shopfunnel/core/campaign/index'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import {
  IconCopy as CopyIcon,
  IconDots as DotsIcon,
  IconFileText as FileTextIcon,
  IconLoader2 as LoaderIcon,
  IconPlus as PlusIcon,
  IconTrash as TrashIcon,
} from '@tabler/icons-react'
import { mutationOptions, queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { formatDate, formatDateRelative, getSessionQueryOptions } from '../-common'
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

const listCampaigns = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Campaign.list(), workspaceId)
  })

const listCampaignsQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['campaigns', workspaceId],
    queryFn: () => listCampaigns({ data: workspaceId }),
  })

const createFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      title: z.string().min(1).max(255),
      campaignId: Identifier.schema('campaign'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.create({ title: data.title, campaignId: data.campaignId }), data.workspaceId)
  })

const duplicateFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      id: Identifier.schema('funnel'),
      title: z.string().optional(),
      campaignId: Identifier.schema('campaign').optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () => Funnel.duplicate({ id: data.id, title: data.title, campaignId: data.campaignId }),
      data.workspaceId,
    )
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
const duplicateDialogHandle = Dialog.createHandle<{
  id: string
  title: string
  campaign: { id: string; name: string } | null
}>()

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard/funnels')({
  staticData: { title: 'Funnels' },
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(listFunnelsQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(listCampaignsQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId)),
    ])
  },
})

function CreateFunnelDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const params = Route.useParams()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const campaignsQuery = useSuspenseQuery(listCampaignsQueryOptions(params.workspaceId))
  const campaigns = campaignsQuery.data ?? []

  const [title, setTitle] = React.useState('')
  const [campaignId, setCampaignId] = React.useState(campaigns[0]?.id ?? '')

  const createFunnelMutation = useMutation({
    mutationFn: (data: { title: string; campaignId: string }) =>
      createFunnel({ data: { workspaceId: params.workspaceId, ...data } }),
    onSuccess: async (id) => {
      await queryClient.invalidateQueries(listFunnelsQueryOptions(params.workspaceId))
      onOpenChange(false)
      await navigate({
        to: '/workspace/$workspaceId/funnels/$id/edit',
        params: { workspaceId: params.workspaceId, id },
      })
    },
  })

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (!open) {
          setTitle('')
          setCampaignId(campaigns[0]?.id ?? '')
        }
      }}
    >
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Create funnel</Dialog.Title>
        </Dialog.Header>

        <div className="flex flex-col gap-4">
          <Field.Root>
            <Field.Label>Title</Field.Label>
            <Field.Content>
              <Input placeholder="Funnel title" value={title} onValueChange={setTitle} />
            </Field.Content>
          </Field.Root>

          <Field.Root>
            <Field.Label>Campaign</Field.Label>
            <Field.Content>
              <Select.Root
                items={campaigns.map((campaign) => ({ label: campaign.name, value: campaign.id }))}
                value={campaignId}
                onValueChange={(value) => setCampaignId(value ?? '')}
              >
                <Select.Trigger className="w-full">
                  <Select.Value placeholder="Select a campaign" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    {campaigns.map((campaign) => (
                      <Select.Item key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </Select.Item>
                    ))}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </Field.Content>
          </Field.Root>
        </div>

        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button
            disabled={createFunnelMutation.isPending || !title.trim() || !campaignId}
            onClick={() => {
              createFunnelMutation.mutate({
                title: title.trim(),
                campaignId,
              })
            }}
          >
            {createFunnelMutation.isPending && <Spinner />}
            Create
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function DuplicateFunnelDialog() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const campaignsQuery = useSuspenseQuery(listCampaignsQueryOptions(params.workspaceId))
  const campaigns = campaignsQuery.data ?? []

  const [title, setTitle] = React.useState('')
  const [campaignId, setCampaignId] = React.useState('')

  const duplicateFunnelMutation = useMutation({
    mutationFn: (data: { id: string; title?: string; campaignId?: string }) =>
      duplicateFunnel({ data: { workspaceId: params.workspaceId, ...data } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(listFunnelsQueryOptions(params.workspaceId))
      duplicateDialogHandle.close()
    },
  })

  return (
    <Dialog.Root
      handle={duplicateDialogHandle}
      onOpenChange={(open) => {
        if (open) {
          const payload = duplicateDialogHandle.store.state.payload
          setTitle(payload ? `${payload.title} copy` : '')
          setCampaignId(payload?.campaign?.id ?? campaigns[0]?.id ?? '')
        }
      }}
    >
      {({ payload: funnel }) =>
        funnel && (
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Duplicate Funnel</Dialog.Title>
              <Dialog.Description>Enter a name for the duplicated funnel.</Dialog.Description>
            </Dialog.Header>

            <div className="flex flex-col gap-4">
              <Field.Root>
                <Field.Label>Title</Field.Label>
                <Field.Content>
                  <Input placeholder={`${funnel.title} copy`} value={title} onValueChange={setTitle} />
                </Field.Content>
              </Field.Root>

              <Field.Root>
                <Field.Label>Campaign</Field.Label>
                <Field.Content>
                  <Select.Root
                    items={campaigns.map((campaign) => ({ label: campaign.name, value: campaign.id }))}
                    value={campaignId}
                    onValueChange={(value) => setCampaignId(value ?? '')}
                  >
                    <Select.Trigger className="w-full">
                      <Select.Value placeholder="Select a campaign" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Group>
                        {campaigns.map((campaign) => (
                          <Select.Item key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>
                </Field.Content>
              </Field.Root>
            </div>

            <Dialog.Footer>
              <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
              <Button
                onClick={() => {
                  duplicateFunnelMutation.mutate({
                    id: funnel.id,
                    title: title.trim() || undefined,
                    campaignId: campaignId || undefined,
                  })
                }}
                disabled={duplicateFunnelMutation.isPending}
              >
                {duplicateFunnelMutation.isPending && <LoaderIcon className="animate-spin" />}
                Duplicate
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        )
      }
    </Dialog.Root>
  )
}

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const listFunnelsQuery = useSuspenseQuery(listFunnelsQueryOptions(params.workspaceId))
  const funnels = listFunnelsQuery.data ?? []

  const sessionQuery = useSuspenseQuery(getSessionQueryOptions(params.workspaceId))
  const isAdmin = sessionQuery.data.isAdmin

  const removeFunnelMutation = useMutation(removeFunnelMutationOptions(params.workspaceId))

  const [isRemoving, setIsRemoving] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

  if (funnels.length === 0) {
    return (
      <div className="flex h-full w-full max-w-6xl flex-col gap-4">
        <Heading.Root>
          <Heading.Content>
            <Heading.Title>Funnels</Heading.Title>
          </Heading.Content>
          {isAdmin && (
            <Heading.Actions>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <PlusIcon />
                Create funnel
              </Button>
            </Heading.Actions>
          )}
        </Heading.Root>

        <div className="rounded-3xl bg-muted p-2">
          <Card.Root>
            <Card.Content>
              <Empty.Root>
                <Empty.Header>
                  <Empty.Media variant="icon">
                    <FileTextIcon />
                  </Empty.Media>
                  <Empty.Title>No funnels yet</Empty.Title>
                  {isAdmin && <Empty.Description>Create your first funnel to get started.</Empty.Description>}
                </Empty.Header>
              </Empty.Root>
            </Card.Content>
          </Card.Root>
        </div>

        <CreateFunnelDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
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
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon />
              Create funnel
            </Button>
          </Heading.Actions>
        )}
      </Heading.Root>
      <DataGrid.Root className="grid-cols-[1fr_min-content] md:grid-cols-[auto_150px_120px_120px_100px]">
        <DataGrid.Header>
          <DataGrid.Head>Name</DataGrid.Head>
          <DataGrid.Head hideOnMobile>Campaign</DataGrid.Head>
          <DataGrid.Head hideOnMobile>Edited</DataGrid.Head>
          <DataGrid.Head hideOnMobile>Created</DataGrid.Head>
          <DataGrid.Head srOnly>Actions</DataGrid.Head>
        </DataGrid.Header>

        <DataGrid.Body>
          {funnels.map((funnel) => (
            <DataGrid.Row
              key={funnel.id}
              render={<Link from={Route.fullPath} to="$id/edit" params={{ id: funnel.id }} />}
            >
              <DataGrid.Cell className="flex-col items-start justify-center overflow-hidden pr-2 md:pr-8">
                <span className="truncate text-sm font-medium text-foreground">{funnel.title}</span>
                <span className="truncate text-xs text-muted-foreground md:hidden">
                  {formatDateRelative(funnel.createdAt)}
                </span>
              </DataGrid.Cell>

              <DataGrid.Cell hideOnMobile>
                <span className="truncate text-sm text-foreground">{funnel.campaign?.name}</span>
              </DataGrid.Cell>

              <DataGrid.Cell hideOnMobile>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<span className="text-sm text-muted-foreground" />}>
                    {formatDateRelative(funnel.updatedAt)}
                  </Tooltip.Trigger>
                  <Tooltip.Content>{formatDate(funnel.updatedAt)}</Tooltip.Content>
                </Tooltip.Root>
              </DataGrid.Cell>

              <DataGrid.Cell hideOnMobile>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<span className="text-sm text-muted-foreground" />}>
                    {formatDateRelative(funnel.createdAt)}
                  </Tooltip.Trigger>
                  <Tooltip.Content>{formatDate(funnel.createdAt)}</Tooltip.Content>
                </Tooltip.Root>
              </DataGrid.Cell>

              {isAdmin && (
                <DataGrid.Cell className="relative shrink-0 justify-end gap-1">
                  <Menu.Root>
                    <Menu.Trigger
                      render={<Button size="icon-sm" variant="ghost" />}
                      onClick={(e) => e.preventDefault()}
                    >
                      <DotsIcon className="text-muted-foreground" />
                    </Menu.Trigger>
                    <Menu.Content align="end">
                      <Menu.Item
                        onClick={(e) => {
                          e.preventDefault()
                          duplicateDialogHandle.openWithPayload({
                            id: funnel.id,
                            title: funnel.title,
                            campaign: funnel.campaign,
                          })
                        }}
                      >
                        <CopyIcon />
                        Duplicate
                      </Menu.Item>
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
                    </Menu.Content>
                  </Menu.Root>
                </DataGrid.Cell>
              )}
            </DataGrid.Row>
          ))}
        </DataGrid.Body>
      </DataGrid.Root>

      <CreateFunnelDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      <DuplicateFunnelDialog />

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
