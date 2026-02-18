import { DataGrid } from '@/components/data-grid'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Menu } from '@/components/ui/menu'
import { Tooltip } from '@/components/ui/tooltip'
import { withActor } from '@/context/auth.withActor'
import { Domain } from '@shopfunnel/core/domain/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconDots as DotsIcon, IconSettings as SettingsIcon, IconWorld as WorldIcon } from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { Heading } from '../-components/heading'
import { formatDate, formatDateRelative } from '../../-common'

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

const createDomain = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      hostname: z.string().regex(/^(?!-)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/, 'Invalid hostname format'),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      return Domain.create({ hostname: data.hostname })
    }, data.workspaceId)
  })

const removeDomain = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(async () => {
      return Domain.remove()
    }, workspaceId)
  })

export const Route = createFileRoute('/_app/workspace/$workspaceId/_dashboard/domains/')({
  staticData: { title: 'Domains' },
  component: DomainsRoute,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getDomainQueryOptions(params.workspaceId))
  },
})

function AddDomainDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const params = Route.useParams()

  const [hostname, setHostname] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const createDomainMutation = useMutation({
    mutationFn: (hostname: string) => createDomain({ data: { workspaceId: params.workspaceId, hostname } }),
    onSuccess: () => {
      setError(null)
      setHostname('')
      onSuccess()
      onOpenChange(false)
    },
    onError: (e) => {
      if (e instanceof Error) {
        setError(e.message)
      }
    },
  })

  const handleSave = async () => {
    if (!hostname.trim()) return
    await createDomainMutation.mutateAsync(hostname)
  }

  React.useEffect(() => {
    if (!open) {
      setHostname('')
      setError(null)
    }
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Add a Domain</Dialog.Title>
          <Dialog.Description>
            Set the record name to your subdomain (e.g., shop) and the target to <strong>cname.shopfunnel.com</strong>.
          </Dialog.Description>
        </Dialog.Header>

        <Field.Root data-invalid={!!error}>
          <Input placeholder="funnel.example.com" value={hostname} onValueChange={(value) => setHostname(value)} />
          <Field.Error>{error}</Field.Error>
        </Field.Root>

        <Dialog.Footer>
          <Button onClick={handleSave} disabled={createDomainMutation.isPending || !hostname.trim()}>
            Add Domain
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function DomainsRoute() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const domainQuery = useSuspenseQuery(getDomainQueryOptions(params.workspaceId))
  const domain = domainQuery.data

  const removeDomainMutation = useMutation({
    mutationFn: () => removeDomain({ data: params.workspaceId }),
    onSuccess: () => {
      queryClient.invalidateQueries(getDomainQueryOptions(params.workspaceId))
    },
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)

  const handleRemove = async () => {
    await removeDomainMutation.mutateAsync()
  }

  const handleSuccess = () => {
    queryClient.invalidateQueries(getDomainQueryOptions(params.workspaceId))
  }

  if (!domain) {
    return (
      <div className="flex h-full w-full max-w-6xl flex-col gap-4">
        <Heading.Root>
          <Heading.Content>
            <Heading.Title>Domains</Heading.Title>
          </Heading.Content>
          <Heading.Actions>
            <Button size="lg" onClick={() => setDialogOpen(true)}>
              Add a domain
            </Button>
          </Heading.Actions>
        </Heading.Root>

        <div className="rounded-3xl bg-muted p-2">
          <Card.Root>
            <Card.Content>
              <Empty.Root>
                <Empty.Header>
                  <Empty.Media variant="icon">
                    <WorldIcon />
                  </Empty.Media>
                  <Empty.Title>No domains yet</Empty.Title>
                  <Empty.Description>Add a custom domain to host your funnels on your own domain.</Empty.Description>
                </Empty.Header>
              </Empty.Root>
            </Card.Content>
          </Card.Root>
        </div>

        <AddDomainDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={handleSuccess} />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full max-w-6xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Domains</Heading.Title>
        </Heading.Content>
      </Heading.Root>

      <DataGrid.Root className="grid-cols-[1fr_min-content] md:grid-cols-[auto_120px_100px]">
        <DataGrid.Header>
          <DataGrid.Head>Name</DataGrid.Head>
          <DataGrid.Head hideOnMobile>Created</DataGrid.Head>
          <DataGrid.Head srOnly>Actions</DataGrid.Head>
        </DataGrid.Header>

        <DataGrid.Body>
          <DataGrid.Row
            render={
              <Link
                to="/workspace/$workspaceId/domains/$domainId/settings"
                params={{ workspaceId: params.workspaceId, domainId: domain.id }}
              />
            }
          >
            <DataGrid.Cell className="flex-col items-start justify-center overflow-hidden pr-2 md:pr-8">
              <span className="truncate text-sm font-medium text-foreground">{domain.hostname}</span>
              <span className="truncate text-xs text-muted-foreground md:hidden">
                {formatDateRelative(domain.createdAt)}
              </span>
            </DataGrid.Cell>

            <DataGrid.Cell hideOnMobile>
              <Tooltip.Root>
                <Tooltip.Trigger render={<span className="text-sm text-muted-foreground" />}>
                  {formatDateRelative(domain.createdAt)}
                </Tooltip.Trigger>
                <Tooltip.Content>{formatDate(domain.createdAt)}</Tooltip.Content>
              </Tooltip.Root>
            </DataGrid.Cell>

            <DataGrid.Cell className="relative shrink-0 justify-end gap-1">
              <Menu.Root>
                <Menu.Trigger
                  render={
                    <Button size="icon-sm" variant="ghost">
                      <DotsIcon className="text-muted-foreground" />
                    </Button>
                  }
                  onClick={(e) => e.preventDefault()}
                />
                <Menu.Content align="end">
                  <Menu.Item
                    render={<Link from={Route.fullPath} to="$domainId/settings" params={{ domainId: domain.id }} />}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SettingsIcon />
                    Settings
                  </Menu.Item>
                  <Menu.Item
                    disabled={removeDomainMutation.isPending}
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove()
                    }}
                  >
                    Remove
                  </Menu.Item>
                </Menu.Content>
              </Menu.Root>
            </DataGrid.Cell>
          </DataGrid.Row>
        </DataGrid.Body>
      </DataGrid.Root>

      <AddDomainDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={handleSuccess} />
    </div>
  )
}
