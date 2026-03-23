import { DataGrid } from '@/components/data-grid'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Menu } from '@/components/ui/menu'
import { Tooltip } from '@/components/ui/tooltip'
import { withActor } from '@/context/auth.withActor'
import { snackbar } from '@/lib/snackbar'
import { Campaign } from '@shopfunnel/core/campaign/index'
import { Identifier } from '@shopfunnel/core/identifier'
import {
  IconDots as DotsIcon,
  IconLink as LinkIcon,
  IconLoader2 as LoaderIcon,
  IconPlus as PlusIcon,
  IconTargetArrow as TargetArrowIcon,
} from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { Heading } from '../-components/heading'
import { formatDate, formatDateRelative, getSessionQueryOptions } from '../../-common'

const listCampaigns = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Campaign.list(), workspaceId)
  })

export const listCampaignsQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['campaigns', workspaceId],
    queryFn: () => listCampaigns({ data: workspaceId }),
  })

const createCampaign = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      name: z.string().min(1).max(255),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Campaign.create({ name: data.name }), data.workspaceId)
  })

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard/campaigns/')({
  staticData: { title: 'Campaigns' },
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(listCampaignsQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId)),
    ])
  },
})

function CreateCampaignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const params = Route.useParams()
  const queryClient = useQueryClient()
  const [name, setName] = React.useState('')

  const createCampaignMutation = useMutation({
    mutationFn: (name: string) => createCampaign({ data: { workspaceId: params.workspaceId, name } }),
    onSuccess: () => {
      queryClient.invalidateQueries(listCampaignsQueryOptions(params.workspaceId))
      onOpenChange(false)
      setName('')
    },
  })

  const handleCreate = () => {
    if (!name.trim()) return
    createCampaignMutation.mutate(name.trim())
  }

  React.useEffect(() => {
    if (!open) setName('')
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Create campaign</Dialog.Title>
          <Dialog.Description>Enter a name for your new campaign.</Dialog.Description>
        </Dialog.Header>
        <Input
          placeholder="Campaign name"
          value={name}
          onValueChange={setName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate()
          }}
        />
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button onClick={handleCreate} disabled={createCampaignMutation.isPending || !name.trim()}>
            {createCampaignMutation.isPending && <LoaderIcon className="animate-spin" />}
            Create
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function RouteComponent() {
  const params = Route.useParams()
  const listCampaignsQuery = useSuspenseQuery(listCampaignsQueryOptions(params.workspaceId))
  const campaigns = listCampaignsQuery.data ?? []

  const sessionQuery = useSuspenseQuery(getSessionQueryOptions(params.workspaceId))
  const isAdmin = sessionQuery.data.isAdmin

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

  if (campaigns.length === 0) {
    return (
      <div className="flex h-full w-full max-w-6xl flex-col gap-4">
        <Heading.Root>
          <Heading.Content>
            <Heading.Title>Campaigns</Heading.Title>
          </Heading.Content>
          {isAdmin && (
            <Heading.Actions>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <PlusIcon />
                Create campaign
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
                    <TargetArrowIcon />
                  </Empty.Media>
                  <Empty.Title>No campaigns yet</Empty.Title>
                  {isAdmin && <Empty.Description>Create your first campaign to get started.</Empty.Description>}
                </Empty.Header>
              </Empty.Root>
            </Card.Content>
          </Card.Root>
        </div>

        <CreateCampaignDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full max-w-6xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Campaigns</Heading.Title>
        </Heading.Content>
        {isAdmin && (
          <Heading.Actions>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon />
              Create campaign
            </Button>
          </Heading.Actions>
        )}
      </Heading.Root>
      <DataGrid.Root className="grid-cols-[1fr_min-content] md:grid-cols-[auto_120px_100px]">
        <DataGrid.Header>
          <DataGrid.Head>Name</DataGrid.Head>
          <DataGrid.Head hideOnMobile>Created</DataGrid.Head>
          <DataGrid.Head srOnly>Actions</DataGrid.Head>
        </DataGrid.Header>

        <DataGrid.Body>
          {campaigns.map((campaign) => (
            <DataGrid.Row
              key={campaign.id}
              render={
                <Link
                  to="/workspace/$workspaceId/campaigns/$campaignId"
                  params={{ workspaceId: params.workspaceId, campaignId: campaign.id }}
                />
              }
            >
              <DataGrid.Cell className="flex-col items-start justify-center overflow-hidden pr-2 md:pr-8">
                <span className="truncate text-sm font-medium text-foreground">{campaign.name}</span>
                <span className="truncate text-xs text-muted-foreground md:hidden">
                  {formatDateRelative(campaign.createdAt)}
                </span>
              </DataGrid.Cell>

              <DataGrid.Cell hideOnMobile>
                <Tooltip.Root>
                  <Tooltip.Trigger render={<span className="text-sm text-muted-foreground" />}>
                    {formatDateRelative(campaign.createdAt)}
                  </Tooltip.Trigger>
                  <Tooltip.Content>{formatDate(campaign.createdAt)}</Tooltip.Content>
                </Tooltip.Root>
              </DataGrid.Cell>

              <DataGrid.Cell className="relative shrink-0 justify-end gap-1">
                <Menu.Root>
                  <Menu.Trigger render={<Button size="icon-sm" variant="ghost" />} onClick={(e) => e.preventDefault()}>
                    <DotsIcon className="text-muted-foreground" />
                  </Menu.Trigger>
                  <Menu.Content align="end">
                    <Menu.Item
                      onClick={(e) => {
                        e.preventDefault()
                        navigator.clipboard.writeText(campaign.url)
                        snackbar.add({ title: 'Link copied to clipboard', type: 'success' })
                      }}
                    >
                      <LinkIcon />
                      Copy link
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Root>
              </DataGrid.Cell>
            </DataGrid.Row>
          ))}
        </DataGrid.Body>
      </DataGrid.Root>

      <CreateCampaignDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}
