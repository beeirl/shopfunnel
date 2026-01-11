import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { withActor } from '@/context/auth.withActor'
import { Actor } from '@shopfunnel/core/actor'
import { Domain } from '@shopfunnel/core/domain/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { User } from '@shopfunnel/core/user/index'
import { IconUser as UserIcon, IconWorldWww as WorldIcon } from '@tabler/icons-react'
import { queryOptions, useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'

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

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard')({
  component: DashboardLayoutRoute,
  ssr: false,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getUserQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getDomainQueryOptions(params.workspaceId)),
    ])
  },
})

function CreateDomainButton() {
  const params = Route.useParams()

  const domainQuery = useSuspenseQuery(getDomainQueryOptions(params.workspaceId))
  const domain = domainQuery.data

  const [open, setOpen] = React.useState(false)
  const [hostname, setHostname] = React.useState(domain?.hostname ?? '')
  const [error, setError] = React.useState<string | null>(null)

  const upsertDomainMutation = useMutation({
    mutationFn: (hostname: string) => upsertDomain({ data: { workspaceId: params.workspaceId, hostname } }),
  })

  const handleSave = async () => {
    try {
      if (!hostname.trim()) return
      await upsertDomainMutation.mutateAsync(hostname)
      setOpen(false)
      setError(null)
    } catch (e) {
      if (!(e instanceof Error)) return
      setError(e.message)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button className="rounded-full border border-border" variant="secondary">
            <WorldIcon />
            Custom Domain
          </Button>
        }
      />
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Custom domain</Dialog.Title>
        </Dialog.Header>
        <Alert.Root>
          <Alert.Title>DNS Configuration</Alert.Title>
          <Alert.Description>
            Point your domain to Shopfunnel by creating a CNAME record with your DNS provider. Set the record name to
            your subdomain (e.g., shop) and the target to cname.shopfunnel.app.
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

function DashboardLayoutRoute() {
  const params = Route.useParams()

  const userQuery = useSuspenseQuery(getUserQueryOptions(params.workspaceId))
  const user = userQuery.data

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-8 py-5">
      <nav className="flex justify-between gap-5">
        <div className="flex">
          <Link from={Route.fullPath} to=".">
            <span className="text-lg font-semibold">Shopfunnel</span>
          </Link>
        </div>
        <div className="flex gap-2">
          <CreateDomainButton />
          <Avatar.Root>
            <Avatar.GroupCount>
              <UserIcon />
            </Avatar.GroupCount>
          </Avatar.Root>
        </div>
      </nav>
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}
