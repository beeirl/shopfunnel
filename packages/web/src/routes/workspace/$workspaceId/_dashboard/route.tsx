import ShopfunnelLogo from '@/assets/shopfunnel-logo.svg?react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Item } from '@/components/ui/item'
import { Menu } from '@/components/ui/menu'
import { withActor } from '@/context/auth.withActor'
import { Account } from '@shopfunnel/core/account/index'
import { Actor } from '@shopfunnel/core/actor'
import { Domain } from '@shopfunnel/core/domain/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Integration } from '@shopfunnel/core/integration/index'
import { User } from '@shopfunnel/core/user/index'
import { IconBuildingSkyscraper as WorkspaceIcon } from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { getShopifyIntegrationQueryOptions } from '../-common'

const getUser = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(async () => {
      const actor = Actor.assert('user')
      const user = await User.fromId(actor.properties.userId)
      return user!
    }, workspaceId)
  })

const getUserQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['user', workspaceId],
    queryFn: () => getUser({ data: workspaceId }),
  })

const getDomain = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(async () => {
      const domain = await Domain.get()
      if (!domain) return null
      return domain
    }, workspaceId)
  })

const getDomainQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['domain', workspaceId],
    queryFn: () => getDomain({ data: workspaceId }),
  })

const getWorkspaces = createServerFn({ method: 'GET' })
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Account.workspaces(), workspaceId)
  })

const getWorkspacesQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['workspaces', workspaceId],
    queryFn: () => getWorkspaces({ data: workspaceId }),
  })

const upsertDomain = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      hostname: z.string().regex(/^(?!-)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/, 'Invalid hostname format'),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      return Domain.upsert({ hostname: data.hostname })
    }, data.workspaceId)
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard')({
  component: DashboardLayoutRoute,
  ssr: false,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getUserQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getDomainQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getWorkspacesQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getShopifyIntegrationQueryOptions(params.workspaceId)),
    ])
  },
})

function CustomDomainDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const params = Route.useParams()

  const domainQuery = useSuspenseQuery(getDomainQueryOptions(params.workspaceId))
  const domain = domainQuery.data

  const [hostname, setHostname] = React.useState(domain?.hostname ?? '')
  const [error, setError] = React.useState<string | null>(null)

  const upsertDomainMutation = useMutation({
    mutationFn: (hostname: string) => upsertDomain({ data: { workspaceId: params.workspaceId, hostname } }),
  })

  const handleSave = async () => {
    try {
      if (!hostname.trim()) return
      await upsertDomainMutation.mutateAsync(hostname)
      onOpenChange(false)
      setError(null)
    } catch (e) {
      if (!(e instanceof Error)) return
      setError(e.message)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Manage custom domain</Dialog.Title>
        </Dialog.Header>
        <Alert.Root>
          <Alert.Title>DNS Configuration</Alert.Title>
          <Alert.Description>
            Point your domain to Shopfunnel by creating a CNAME record with your DNS provider. Set the record name to
            your subdomain (e.g., shop) and the target to cname.shopfunnel.com.
          </Alert.Description>
        </Alert.Root>
        <Field.Root data-invalid={!!error}>
          <Input placeholder="funnel.example.com" value={hostname} onValueChange={(value) => setHostname(value)} />
          <Field.Error>{error}</Field.Error>
        </Field.Root>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button onClick={handleSave} disabled={upsertDomainMutation.isPending}>
            Save
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function ShopifyIntegrationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const integrationQuery = useSuspenseQuery(getShopifyIntegrationQueryOptions(params.workspaceId))
  const integration = integrationQuery.data

  const disconnectMutation = useMutation({
    mutationFn: (integrationId: string) =>
      disconnectShopifyIntegration({ data: { workspaceId: params.workspaceId, integrationId } }),
  })

  const [disconnecting, setDisconnecting] = React.useState(false)

  const handleDisconnect = async () => {
    if (!integration) return
    setDisconnecting(true)
    await disconnectMutation.mutateAsync(integration.id)
    await queryClient.invalidateQueries(getShopifyIntegrationQueryOptions(params.workspaceId))
    setDisconnecting(false)
  }

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
        {integration ? (
          <Item.Root variant="outline">
            <Item.Content className="overflow-hidden">
              <Item.Title className="truncate">{integration.title}</Item.Title>
              <Item.Description className="truncate">
                Connected on {formatDate(new Date(integration.createdAt))}
              </Item.Description>
            </Item.Content>
            <Item.Actions>
              <Button disabled={disconnecting} variant="secondary" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </Item.Actions>
          </Item.Root>
        ) : (
          <Button
            size="lg"
            nativeButton={false}
            render={<a href="https://apps.shopify.com" target="_blank" rel="noopener noreferrer" />}
          >
            Connect shop
          </Button>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}

function DashboardLayoutRoute() {
  const params = Route.useParams()

  const workspacesQuery = useSuspenseQuery(getWorkspacesQueryOptions(params.workspaceId))
  const workspaces = workspacesQuery.data
  const currentWorkspace = workspaces.find((workspace) => workspace.id === params.workspaceId)

  const [domainDialogOpen, setDomainDialogOpen] = React.useState(false)
  const [shopifyDialogOpen, setShopifyDialogOpen] = React.useState(false)

  const handleWorkspaceSwitch = (workspaceId: string) => {
    if (workspaceId === params.workspaceId) return
    window.location.href = `/workspace/${workspaceId}`
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-8 py-5">
      <nav className="flex items-center justify-between gap-5">
        <ShopfunnelLogo className="h-4.5 w-auto" />
        <div className="flex gap-2">
          <Menu.Root>
            <Menu.Trigger
              render={
                <Button className="rounded-full border border-border" variant="secondary">
                  <WorkspaceIcon />
                  {currentWorkspace?.name ?? 'Workspace'}
                </Button>
              }
            />
            <Menu.Content align="end">
              <Menu.Item onClick={() => setShopifyDialogOpen(true)}>Shopify integration</Menu.Item>
              <Menu.Item onClick={() => setDomainDialogOpen(true)}>Manage custom domain</Menu.Item>
              {workspaces.length > 1 && (
                <Menu.Sub>
                  <Menu.SubTrigger>Switch workspace</Menu.SubTrigger>
                  <Menu.SubContent sideOffset={3}>
                    <Menu.RadioGroup value={params.workspaceId}>
                      {workspaces.map((workspace) => (
                        <Menu.RadioItem
                          key={workspace.id}
                          value={workspace.id}
                          onClick={() => handleWorkspaceSwitch(workspace.id)}
                        >
                          {workspace.name}
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.SubContent>
                </Menu.Sub>
              )}
              <Menu.Separator />
              <Menu.Item variant="destructive" render={<a href="/auth/logout" />}>
                Logout
              </Menu.Item>
            </Menu.Content>
          </Menu.Root>
        </div>
      </nav>

      <CustomDomainDialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen} />
      <ShopifyIntegrationDialog open={shopifyDialogOpen} onOpenChange={setShopifyDialogOpen} />

      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}
