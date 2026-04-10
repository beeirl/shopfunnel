import { DataGrid } from '@/components/data-grid'
import { Icon, type IconName } from '@/components/icon'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Menu } from '@/components/ui/menu'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip } from '@/components/ui/tooltip'
import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Integration } from '@shopfunnel/core/integration/index'
import { Recart } from '@shopfunnel/core/integration/recart'
import { IconBlocks as BlocksIcon, IconDots as DotsIcon, IconPlus as PlusIcon } from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { formatDate, formatDateRelative } from '../-common'
import { Heading } from './-components/heading'

const PROVIDER_META = {
  shopify: { name: 'Shopify', icon: 'shopify' },
  meta_pixel: { name: 'Meta Pixel', icon: 'meta' },
  klaviyo: { name: 'Klaviyo', icon: 'klaviyo' },
  recart: { name: 'Recart', icon: 'recart' },
} satisfies Record<string, { name: string; icon: IconName }>

const listIntegrations = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(async ({ data: workspaceId }) => {
    return withActor(() => Integration.list(), workspaceId)
  })

const listIntegrationsQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['integrations', workspaceId],
    queryFn: () => listIntegrations({ data: workspaceId }),
  })

const connectMetaPixelIntegration = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      pixelId: z.string().min(1),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      await Integration.disconnect({ provider: 'meta_pixel' })

      return Integration.connect({
        provider: 'meta_pixel',
        externalId: data.pixelId,
        title: data.pixelId,
        credentials: {},
        metadata: { pixelId: data.pixelId },
      })
    }, data.workspaceId)
  })

const disconnectIntegration = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      integrationId: Identifier.schema('integration'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Integration.disconnect({ integrationId: data.integrationId }), data.workspaceId)
  })

const connectRecartIntegration = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      apiKey: z.string().min(1),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      await Integration.disconnect({ provider: 'recart' })
      await Recart.connect({ apiKey: data.apiKey })
    }, data.workspaceId)
  })

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard/integrations')({
  staticData: { title: 'Integrations' },
  component: IntegrationsRoute,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(listIntegrationsQueryOptions(params.workspaceId))
  },
})

function IntegrationCard({
  icon,
  title,
  description,
  ...props
}: React.ComponentProps<'button'> & {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      className="flex w-full flex-col items-start rounded-2xl border border-border p-4 pb-3 text-left text-sm font-medium whitespace-normal text-foreground transition-colors duration-200 hover:bg-accent active:bg-accent"
      {...props}
    >
      <div className="relative flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
        {icon}
      </div>
      <div className="mt-2 flex w-full flex-col space-y-1">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="line-clamp-2 text-sm text-muted-foreground">{description}</span>
      </div>
    </button>
  )
}

function IntegrationsRoute() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const [addIntegrationDialogOpen, setAddIntegrationDialogOpen] = React.useState(false)
  const [metaPixelId, setMetaPixelId] = React.useState('')
  const [recartApiKey, setRecartApiKey] = React.useState('')

  const integrationsQuery = useSuspenseQuery(listIntegrationsQueryOptions(params.workspaceId))
  const integrations = integrationsQuery.data

  const connectMetaPixelMutation = useMutation({
    mutationFn: (id: string) => connectMetaPixelIntegration({ data: { workspaceId: params.workspaceId, pixelId: id } }),
    onSuccess: () => {
      queryClient.invalidateQueries(listIntegrationsQueryOptions(params.workspaceId))
      setMetaPixelId('')
      setAddIntegrationDialogOpen(false)
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: (integrationId: string) =>
      disconnectIntegration({ data: { workspaceId: params.workspaceId, integrationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries(listIntegrationsQueryOptions(params.workspaceId))
    },
  })

  const connectRecartMutation = useMutation({
    mutationFn: (apiKey: string) => connectRecartIntegration({ data: { workspaceId: params.workspaceId, apiKey } }),
    onSuccess: () => {
      queryClient.invalidateQueries(listIntegrationsQueryOptions(params.workspaceId))
      setRecartApiKey('')
      setAddIntegrationDialogOpen(false)
    },
  })

  return (
    <div className="flex h-full w-full max-w-6xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Integrations</Heading.Title>
        </Heading.Content>
        <Heading.Actions>
          <Dialog.Root open={addIntegrationDialogOpen} onOpenChange={setAddIntegrationDialogOpen}>
            <Dialog.Trigger render={<Button />}>
              <PlusIcon />
              Add integration
            </Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Add Integration</Dialog.Title>
              </Dialog.Header>
              <div className="grid grid-cols-2 gap-3">
                <IntegrationCard
                  icon={<Icon name="shopify" className="size-5 text-foreground" />}
                  title="Shopify"
                  description="Track conversions and orders."
                  onClick={() => {
                    window.open('https://apps.shopify.com/shopfunnel-1', '_blank')
                  }}
                />

                <Dialog.Root
                  onOpenChange={(open) => {
                    if (!open) setMetaPixelId('')
                  }}
                >
                  <Dialog.Trigger
                    render={
                      <IntegrationCard
                        icon={<Icon name="meta" className="size-5 text-foreground" />}
                        title="Meta Pixel"
                        description="Track page views and custom events."
                      />
                    }
                  />
                  <Dialog.Content>
                    <Dialog.Header>
                      <Dialog.Title>Meta Pixel</Dialog.Title>
                    </Dialog.Header>
                    <form
                      className="flex flex-col gap-4"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (metaPixelId.trim()) {
                          connectMetaPixelMutation.mutate(metaPixelId.trim())
                        }
                      }}
                    >
                      <Input
                        placeholder="Enter your Meta Pixel ID"
                        value={metaPixelId}
                        onValueChange={setMetaPixelId}
                      />
                      <Button
                        size="lg"
                        type="submit"
                        disabled={!metaPixelId.trim() || connectMetaPixelMutation.isPending}
                      >
                        {connectMetaPixelMutation.isPending && <Spinner />}
                        Connect
                      </Button>
                    </form>
                  </Dialog.Content>
                </Dialog.Root>

                <IntegrationCard
                  icon={<Icon name="klaviyo" className="size-5 text-foreground" />}
                  title="Klaviyo"
                  description="Sync leads to your Klaviyo account."
                  onClick={() => {
                    window.location.href = '/api/klaviyo/authorize'
                  }}
                />

                {/* <Dialog.Root
                  onOpenChange={(open) => {
                    if (!open) setRecartApiKey('')
                  }}
                >
                  <Dialog.Trigger
                    render={
                      <IntegrationCard
                        icon={<Icon name="recart" className="size-5 text-foreground" />}
                        title="Recart"
                        description="Sync phone leads to your Recart account."
                      />
                    }
                  />
                  <Dialog.Content>
                    <Dialog.Header>
                      <Dialog.Title>Recart</Dialog.Title>
                    </Dialog.Header>
                    <form
                      className="flex flex-col gap-4"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (recartApiKey.trim()) {
                          connectRecartMutation.mutate(recartApiKey.trim())
                        }
                      }}
                    >
                      <Input
                        placeholder="Enter your Recart API key"
                        value={recartApiKey}
                        onValueChange={setRecartApiKey}
                      />
                      <Button
                        size="lg"
                        type="submit"
                        disabled={!recartApiKey.trim() || connectRecartMutation.isPending}
                      >
                        {connectRecartMutation.isPending && <Spinner />}
                        Connect
                      </Button>
                    </form>
                  </Dialog.Content>
                </Dialog.Root> */}
              </div>
            </Dialog.Content>
          </Dialog.Root>
        </Heading.Actions>
      </Heading.Root>

      {integrations.length === 0 ? (
        <div className="rounded-3xl bg-muted p-2">
          <Card.Root>
            <Card.Content>
              <Empty.Root>
                <Empty.Header>
                  <Empty.Media variant="icon">
                    <BlocksIcon />
                  </Empty.Media>
                  <Empty.Title>No integrations yet</Empty.Title>
                  <Empty.Description>
                    Connect Shopify, Meta Pixel, Klaviyo, or Recart to track conversions and sync leads.
                  </Empty.Description>
                </Empty.Header>
              </Empty.Root>
            </Card.Content>
          </Card.Root>
        </div>
      ) : (
        <DataGrid.Root className="grid-cols-[1fr_min-content] md:grid-cols-[auto_120px_100px]">
          <DataGrid.Header>
            <DataGrid.Head>Name</DataGrid.Head>
            <DataGrid.Head hideOnMobile>Created</DataGrid.Head>
            <DataGrid.Head srOnly>Actions</DataGrid.Head>
          </DataGrid.Header>

          <DataGrid.Body>
            {integrations.map((integration) => {
              const providerMeta = PROVIDER_META[integration.provider as keyof typeof PROVIDER_META]
              const subtitle = integration.provider === 'recart' ? undefined : integration.title

              return (
                <DataGrid.Row key={integration.id}>
                  <DataGrid.Cell className="gap-3 overflow-hidden pr-2 md:pr-8">
                    {providerMeta && (
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                        <Icon name={providerMeta.icon} className="size-5 text-foreground" />
                      </div>
                    )}
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">{integration.title}</span>
                      {subtitle && (
                        <span className="truncate text-sm text-muted-foreground">
                          <span className="md:hidden">
                            {subtitle} &middot; {formatDateRelative(integration.createdAt)}
                          </span>
                          <span className="hidden md:inline">{subtitle}</span>
                        </span>
                      )}
                    </div>
                  </DataGrid.Cell>

                  <DataGrid.Cell hideOnMobile>
                    <Tooltip.Root>
                      <Tooltip.Trigger render={<span className="text-sm text-muted-foreground" />}>
                        {formatDateRelative(integration.createdAt)}
                      </Tooltip.Trigger>
                      <Tooltip.Content>{formatDate(integration.createdAt)}</Tooltip.Content>
                    </Tooltip.Root>
                  </DataGrid.Cell>

                  <DataGrid.Cell className="relative shrink-0 justify-end gap-1">
                    <Menu.Root>
                      <Menu.Trigger render={<Button size="icon-sm" variant="ghost" />}>
                        <DotsIcon className="text-muted-foreground" />
                      </Menu.Trigger>
                      <Menu.Content align="end">
                        <Menu.Item
                          variant="destructive"
                          onClick={() => disconnectMutation.mutate(integration.id)}
                          disabled={disconnectMutation.isPending}
                        >
                          Disconnect
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Root>
                  </DataGrid.Cell>
                </DataGrid.Row>
              )
            })}
          </DataGrid.Body>
        </DataGrid.Root>
      )}
    </div>
  )
}
