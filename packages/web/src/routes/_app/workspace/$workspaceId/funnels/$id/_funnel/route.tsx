import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Menu } from '@/components/ui/menu'
import { Tooltip } from '@/components/ui/tooltip'
import { withActor } from '@/context/auth.withActor'
import { snackbar } from '@/lib/snackbar'
import { cn } from '@/lib/utils'
import { getSessionQueryOptions } from '@/routes/_app/workspace/$workspaceId/-common'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import {
  IconChevronDown as ChevronDownIcon,
  IconChevronLeft as ChevronLeftIcon,
  IconLoader2 as LoaderIcon,
} from '@tabler/icons-react'
import { mutationOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, linkOptions, MatchRoute, Outlet, useBlocker } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { getFunnelQueryOptions } from '../-common'
import { createFunnelCollection } from './-common'
import { FunnelProvider, useFunnel } from './-context'

const publishFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.publish(data.funnelId), data.workspaceId)
  })

const publishFunnelMutationOptions = (workspaceId: string, funnelId: string) =>
  mutationOptions({
    mutationFn: () => publishFunnel({ data: { workspaceId, funnelId } }),
  })

const unpublishFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.unpublish(data.funnelId), data.workspaceId)
  })

const unpublishFunnelMutationOptions = (workspaceId: string, funnelId: string) =>
  mutationOptions({
    mutationFn: () => unpublishFunnel({ data: { workspaceId, funnelId } }),
  })

export const Route = createFileRoute('/_app/workspace/$workspaceId/funnels/$id/_funnel')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const funnelCollection = createFunnelCollection(params.workspaceId, params.id, context.queryClient)

    await Promise.all([
      funnelCollection.preload(),
      context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId)),
    ])

    return { funnelCollection }
  },
})

function Title() {
  const { data: funnel, save } = useFunnel()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [value, setValue] = React.useState(funnel.title)
  const [error, setError] = React.useState<string | null>(null)

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (open) {
      setValue(funnel.title)
      setError(null)
    }
  }

  const handleTitleSave = () => {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      setError('Title cannot be empty')
      return
    }
    setDialogOpen(false)
    save({ title: trimmedValue })
  }

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      <Dialog.Trigger aria-label="Edit funnel title" render={<Button variant="ghost">{funnel.title}</Button>} />
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Edit funnel title</Dialog.Title>
        </Dialog.Header>
        <Field.Root data-invalid={!!error}>
          <Input
            autoFocus
            placeholder="Enter funnel title"
            value={value}
            onValueChange={(value) => {
              setValue(value)
              if (error) setError(null)
            }}
          />
          <Field.Error>{error}</Field.Error>
        </Field.Root>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button onClick={handleTitleSave}>Save</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function Settings() {
  const { data: funnel, save } = useFunnel()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [value, setValue] = React.useState({
    privacyUrl: funnel.settings?.privacyUrl,
    termsUrl: funnel.settings?.termsUrl,
  })

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (open) setValue({ privacyUrl: funnel.settings?.privacyUrl, termsUrl: funnel.settings?.termsUrl })
  }

  const handleSettingsSave = () => {
    setDialogOpen(false)
    save({ settings: value })
  }

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      <Dialog.Trigger
        render={
          <Button className="cursor-pointer" variant="ghost">
            Settings
          </Button>
        }
      />
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Settings</Dialog.Title>
        </Dialog.Header>
        <div className="flex flex-col gap-4">
          <Field.Root>
            <Field.Label>Privacy Policy URL</Field.Label>
            <Input
              placeholder="https://example.com/privacy"
              value={value.privacyUrl ?? ''}
              onValueChange={(value) => setValue((prev) => ({ ...prev, privacyUrl: value || undefined }))}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>Terms of Service URL</Field.Label>
            <Input
              placeholder="https://example.com/terms"
              value={value.termsUrl ?? ''}
              onValueChange={(value) => setValue((prev) => ({ ...prev, termsUrl: value || undefined }))}
            />
          </Field.Root>
        </div>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button onClick={handleSettingsSave}>Save</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function PublishButton() {
  const params = Route.useParams()
  const queryClient = useQueryClient()
  const funnel = useFunnel()

  const [isPublishing, setIsPublishing] = React.useState(false)

  const publishMutation = useMutation(publishFunnelMutationOptions(params.workspaceId, params.id))
  const unpublishMutation = useMutation(unpublishFunnelMutationOptions(params.workspaceId, params.id))

  const handlePublish = async () => {
    setIsPublishing(true)
    await publishMutation.mutateAsync()
    await queryClient.invalidateQueries(getFunnelQueryOptions(params.workspaceId, params.id))
    setIsPublishing(false)
    snackbar.add({ title: 'Funnel published', type: 'success' })
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(funnel.data.url)
    snackbar.add({ title: 'Link copied to clipboard', type: 'success' })
  }

  const handleUnpublish = async () => {
    setIsPublishing(true)
    await unpublishMutation.mutateAsync()
    await queryClient.invalidateQueries(getFunnelQueryOptions(params.workspaceId, params.id))
    setIsPublishing(false)
    snackbar.add({ title: 'Funnel unpublished', type: 'success' })
  }

  return (
    <ButtonGroup.Root className="min-w-28">
      <Tooltip.Root disabled={funnel.data.draft || isPublishing}>
        <Tooltip.Trigger
          render={
            <Button
              className={cn('flex-1', isPublishing && 'pointer-events-none')}
              disabled={funnel.isSaving}
              onClick={funnel.data.draft ? handlePublish : undefined}
            >
              {isPublishing ? <LoaderIcon className="animate-spin" /> : 'Publish'}
            </Button>
          }
        />
        <Tooltip.Content side="left" sideOffset={8}>
          No changes to publish
        </Tooltip.Content>
      </Tooltip.Root>
      <Menu.Root>
        <Menu.Trigger
          render={
            <Button size="icon">
              <ChevronDownIcon />
            </Button>
          }
        />
        <Menu.Content align="end">
          <Menu.Item onClick={handleCopyLink}>Copy shareable link</Menu.Item>
          <Menu.Item disabled={!funnel.data.published} onClick={handleUnpublish}>
            Unpublish
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </ButtonGroup.Root>
  )
}

function NavigationBlocker() {
  const { isSaving } = useFunnel()

  useBlocker({
    shouldBlockFn: () => isSaving,
    enableBeforeUnload: () => isSaving,
  })

  return null
}

function DraftBadge() {
  const funnel = useFunnel()
  if (!funnel.data.draft) return null
  return <Badge variant="secondary">Draft</Badge>
}

const tabs = [
  { title: 'Edit', linkOptions: linkOptions({ from: Route.fullPath, to: './edit' }), adminOnly: true },
  { title: 'Insights', linkOptions: linkOptions({ from: Route.fullPath, to: './insights' }), adminOnly: false },
  { title: 'Responses', linkOptions: linkOptions({ from: Route.fullPath, to: './responses' }), adminOnly: false },
]

function RouteComponent() {
  const params = Route.useParams()
  const { funnelCollection } = Route.useLoaderData()

  const sessionQuery = useSuspenseQuery(getSessionQueryOptions(params.workspaceId))
  const session = sessionQuery.data

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || session.isAdmin)

  return (
    <FunnelProvider collection={funnelCollection}>
      <NavigationBlocker />
      <div
        className="flex min-h-screen w-screen flex-col"
        style={{ '--dashboard-header-height': '3rem' } as React.CSSProperties}
      >
        <div className="sticky top-0 z-10 grid h-(--dashboard-header-height) w-full shrink-0 grid-cols-3 items-center border-b border-border bg-background px-2">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" render={<Link from={Route.fullPath} to="../../funnels" />}>
              <ChevronLeftIcon />
            </Button>
            <Title />
          </div>
          <div className="flex items-center justify-center gap-1">
            {visibleTabs.map((tab) => (
              <MatchRoute key={tab.title} {...tab.linkOptions}>
                {(match) => (
                  <Button
                    variant={match ? 'secondary' : 'ghost'}
                    nativeButton={false}
                    render={<Link {...tab.linkOptions} />}
                  >
                    {tab.title}
                  </Button>
                )}
              </MatchRoute>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            <DraftBadge />
            {session.isAdmin && (
              <Button
                variant="ghost"
                aria-label="Preview"
                nativeButton={false}
                render={<Link from={Route.fullPath} to="preview" target="_blank" />}
              >
                Preview
              </Button>
            )}
            {session.isAdmin && <PublishButton />}
          </div>
        </div>
        <Outlet />
      </div>
    </FunnelProvider>
  )
}
