import { DataGrid } from '@/components/data-grid'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { Menu } from '@/components/ui/menu'
import { Tooltip } from '@/components/ui/tooltip'
import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Integration } from '@shopfunnel/core/integration/index'
import { IconBlocks as BlocksIcon, IconDots as DotsIcon } from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { DateTime } from 'luxon'
import * as React from 'react'
import { z } from 'zod'
import { Heading } from './-components/heading'

const getShopifyIntegration = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(async ({ data: workspaceId }) => {
    const integration = await withActor(() => Integration.fromProvider('shopify'), workspaceId)
    return integration ?? null
  })

const getShopifyIntegrationQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['shopify-integration', workspaceId],
    queryFn: () => getShopifyIntegration({ data: workspaceId }),
  })

const disconnectShopifyIntegration = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      integrationId: Identifier.schema('integration'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Integration.disconnect({ integrationId: data.integrationId }), data.workspaceId)
  })

export const Route = createFileRoute('/_app/workspace/$workspaceId/_dashboard/integrations')({
  staticData: { title: 'Integrations' },
  component: IntegrationsRoute,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getShopifyIntegrationQueryOptions(params.workspaceId))
  },
})

function AddIntegrationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Shopify Integration</Dialog.Title>
          <Dialog.Description>
            Automatically track page views and conversions when visitors from your funnels complete a checkout on
            Shopify.
          </Dialog.Description>
        </Dialog.Header>
        <Button
          size="lg"
          nativeButton={false}
          render={<a href="https://apps.shopify.com" target="_blank" rel="noopener noreferrer" />}
        >
          Connect shop
        </Button>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function IntegrationsRoute() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const integrationQuery = useSuspenseQuery(getShopifyIntegrationQueryOptions(params.workspaceId))
  const integration = integrationQuery.data

  const disconnectMutation = useMutation({
    mutationFn: (integrationId: string) =>
      disconnectShopifyIntegration({ data: { workspaceId: params.workspaceId, integrationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries(getShopifyIntegrationQueryOptions(params.workspaceId))
    },
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)

  const handleDisconnect = async () => {
    if (!integration) return
    await disconnectMutation.mutateAsync(integration.id)
  }

  if (!integration) {
    return (
      <div className="flex h-full w-full max-w-6xl flex-col gap-4">
        <Heading.Root>
          <Heading.Content>
            <Heading.Title>Integrations</Heading.Title>
          </Heading.Content>
          <Heading.Actions>
            <Button size="lg" onClick={() => setDialogOpen(true)}>
              Add a integration
            </Button>
          </Heading.Actions>
        </Heading.Root>

        <div className="rounded-3xl bg-muted p-2">
          <Card.Root>
            <Card.Content>
              <Empty.Root>
                <Empty.Header>
                  <Empty.Media variant="icon">
                    <BlocksIcon />
                  </Empty.Media>
                  <Empty.Title>No integrations yet</Empty.Title>
                  <Empty.Description>Connect your Shopify store to track conversions and orders.</Empty.Description>
                </Empty.Header>
              </Empty.Root>
            </Card.Content>
          </Card.Root>
        </div>

        <AddIntegrationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full max-w-6xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Integrations</Heading.Title>
        </Heading.Content>
      </Heading.Root>

      <DataGrid.Root className="grid-cols-[1fr_min-content] md:grid-cols-[auto_120px_100px]">
        <DataGrid.Header>
          <DataGrid.Head>Name</DataGrid.Head>
          <DataGrid.Head hideOnMobile>Created</DataGrid.Head>
          <DataGrid.Head srOnly>Actions</DataGrid.Head>
        </DataGrid.Header>

        <DataGrid.Body>
          <DataGrid.Row>
            <DataGrid.Cell className="flex-col items-start justify-center overflow-hidden pr-2 md:pr-8">
              <span className="truncate text-sm font-medium text-foreground">{integration.title}</span>
              <span className="truncate text-sm text-muted-foreground">
                <span className="md:hidden">
                  {(integration.metadata as { shopDomain?: string })?.shopDomain} &middot;{' '}
                  {DateTime.fromJSDate(integration.createdAt).toRelative()}
                </span>
                <span className="hidden md:inline">
                  {(integration.metadata as { shopDomain?: string })?.shopDomain}
                </span>
              </span>
            </DataGrid.Cell>

            <DataGrid.Cell hideOnMobile>
              <Tooltip.Root>
                <Tooltip.Trigger render={<span className="text-sm text-muted-foreground" />}>
                  {DateTime.fromJSDate(integration.createdAt).toRelative()}
                </Tooltip.Trigger>
                <Tooltip.Content>
                  {DateTime.fromJSDate(integration.createdAt).toLocaleString(DateTime.DATETIME_MED)}
                </Tooltip.Content>
              </Tooltip.Root>
            </DataGrid.Cell>

            <DataGrid.Cell className="relative shrink-0 justify-end gap-1">
              <Menu.Root>
                <Menu.Trigger render={<Button size="icon-sm" variant="ghost" />}>
                  <DotsIcon className="text-muted-foreground" />
                </Menu.Trigger>
                <Menu.Content align="end">
                  <Menu.Item variant="destructive" onClick={handleDisconnect} disabled={disconnectMutation.isPending}>
                    Disconnect
                  </Menu.Item>
                </Menu.Content>
              </Menu.Root>
            </DataGrid.Cell>
          </DataGrid.Row>
        </DataGrid.Body>
      </DataGrid.Root>

      <AddIntegrationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
