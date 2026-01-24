import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { withActor } from '@/context/auth.withActor'
import { cn } from '@/lib/utils'
import { Funnel } from '@shopfunnel/core/funnel/index'
import type { Settings as SettingsType } from '@shopfunnel/core/funnel/types'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconChevronLeft as ChevronLeftIcon, IconLoader2 as LoaderIcon } from '@tabler/icons-react'
import { mutationOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, linkOptions, MatchRoute, Outlet, useBlocker } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { getFunnelQueryOptions } from '../-common'
import { getSessionQueryOptions } from '../../../-common'
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

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel')({
  component: RouteComponent,
  ssr: false,
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
  const [value, setValue] = React.useState<SettingsType>(funnel.settings)

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (open) setValue(funnel.settings)
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
            <Field.Label>Meta Pixel ID</Field.Label>
            <Input
              placeholder="Enter Meta Pixel ID"
              value={value.metaPixelId ?? ''}
              onValueChange={(value) => setValue((prev) => ({ ...prev, metaPixelId: value || undefined }))}
            />
          </Field.Root>
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

  const handlePublish = async () => {
    setIsPublishing(true)
    await publishMutation.mutateAsync()
    await queryClient.invalidateQueries(getFunnelQueryOptions(params.workspaceId, params.id))
    setIsPublishing(false)
  }

  return (
    <Button
      className={cn(isPublishing && 'pointer-events-none')}
      disabled={funnel.data.published || funnel.isSaving}
      variant={funnel.data.published ? 'ghost' : 'default'}
      onClick={handlePublish}
    >
      {isPublishing && <LoaderIcon className="animate-spin" />}
      Publish
    </Button>
  )
}

function ShareButton() {
  const { data: funnel } = useFunnel()

  return (
    <Button
      variant="ghost"
      aria-label="Share"
      render={<a href={funnel.url} target="_blank" rel="noopener noreferrer" />}
    >
      Share
    </Button>
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
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to dashboard"
              nativeButton={false}
              render={<Link from={Route.fullPath} to="../.." />}
            >
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
            <Settings />
          </div>
          <div className="flex items-center justify-end gap-1">
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
            <ShareButton />
            {session.isAdmin && <PublishButton />}
          </div>
        </div>
        <Outlet />
      </div>
    </FunnelProvider>
  )
}
