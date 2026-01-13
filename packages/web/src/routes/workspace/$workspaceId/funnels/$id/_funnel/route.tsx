import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import type { Settings as SettingsType } from '@shopfunnel/core/funnel/types'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconChevronLeft as ChevronLeftIcon } from '@tabler/icons-react'
import { mutationOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, linkOptions, MatchRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { getFunnelQueryOptions } from '../-common'
import { getSessionQueryOptions } from '../../../-common'

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

const updateFunnelTitle = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      title: z.string().min(1).max(255),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.updateTitle({ id: data.funnelId, title: data.title }), data.workspaceId)
  })

const updateFunnelTitleMutationOptions = (workspaceId: string, funnelId: string) =>
  mutationOptions({
    mutationFn: (title: string) => updateFunnelTitle({ data: { workspaceId, funnelId, title } }),
  })

const updateFunnelSettings = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      settings: z.custom<SettingsType>(),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.updateSettings({ id: data.funnelId, settings: data.settings }), data.workspaceId)
  })

const updateFunnelSettingsMutationOptions = (workspaceId: string, funnelId: string) =>
  mutationOptions({
    mutationFn: (settings: SettingsType) => updateFunnelSettings({ data: { workspaceId, funnelId, settings } }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel')({
  component: RouteComponent,
  ssr: false,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getFunnelQueryOptions(params.workspaceId, params.id)),
      context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId)),
    ])
  },
})

function Title({ title }: { title: string }) {
  const params = Route.useParams()
  const queryClient = useQueryClient()
  const updateTitleMutation = useMutation(updateFunnelTitleMutationOptions(params.workspaceId, params.id))

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [value, setValue] = React.useState(title)
  const [error, setError] = React.useState<string | null>(null)

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (open) {
      setValue(title)
      setError(null)
    }
  }

  const handleTitleSave = async () => {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      setError('Title cannot be empty')
      return
    }
    setDialogOpen(false)
    await updateTitleMutation.mutateAsync(trimmedValue)
    queryClient.invalidateQueries(getFunnelQueryOptions(params.workspaceId, params.id))
  }

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      <Dialog.Trigger aria-label="Edit funnel title" render={<Button variant="ghost">{title}</Button>} />
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
          <Button onClick={handleTitleSave} disabled={updateTitleMutation.isPending}>
            Save
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function Settings({ settings }: { settings: SettingsType }) {
  const params = Route.useParams()

  const queryClient = useQueryClient()
  const updateSettingsMutation = useMutation(updateFunnelSettingsMutationOptions(params.workspaceId, params.id))

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [value, setValue] = React.useState<SettingsType>(settings)

  const handlDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (open) setValue(settings)
  }

  const handleSettingsSave = async () => {
    setDialogOpen(false)
    await updateSettingsMutation.mutateAsync(value)
    queryClient.invalidateQueries(getFunnelQueryOptions(params.workspaceId, params.id))
  }

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={handlDialogOpenChange}>
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
          <Button onClick={handleSettingsSave} disabled={updateSettingsMutation.isPending}>
            Save
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

const allTabs = [
  { title: 'Edit', linkOptions: linkOptions({ from: Route.fullPath, to: './edit' }), adminOnly: true },
  { title: 'Insights', linkOptions: linkOptions({ from: Route.fullPath, to: './insights' }), adminOnly: false },
  { title: 'Responses', linkOptions: linkOptions({ from: Route.fullPath, to: './responses' }), adminOnly: false },
]

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const funnelQuery = useSuspenseQuery(getFunnelQueryOptions(params.workspaceId, params.id))
  const funnel = funnelQuery.data

  const sessionQuery = useSuspenseQuery(getSessionQueryOptions(params.workspaceId))
  const isAdmin = sessionQuery.data.isAdmin

  const tabs = allTabs.filter((tab) => !tab.adminOnly || isAdmin)

  const publishMutation = useMutation(publishFunnelMutationOptions(params.workspaceId, params.id))

  return (
    <div className="flex h-screen w-screen flex-col">
      <div className="grid h-12 w-full shrink-0 grid-cols-3 items-center border-b border-border bg-background px-2">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to dashboard"
            render={<Link from={Route.fullPath} to="../.." />}
          >
            <ChevronLeftIcon />
          </Button>
          <Title title={funnel.title} />
        </div>
        <div className="flex items-center justify-center gap-1">
          {tabs.map((tab) => (
            <MatchRoute key={tab.title} {...tab.linkOptions}>
              {(match) => (
                <Button variant={match ? 'secondary' : 'ghost'} render={<Link {...tab.linkOptions} />}>
                  {tab.title}
                </Button>
              )}
            </MatchRoute>
          ))}
          <Settings settings={funnel.settings} />
        </div>
        <div className="flex items-center justify-end gap-1">
          {isAdmin && (
            <Button
              variant="ghost"
              aria-label="Preview"
              render={<Link from={Route.fullPath} to="preview" target="_blank" />}
            >
              Preview
            </Button>
          )}
          <Button
            variant="ghost"
            aria-label="Share"
            render={<Link to="/f/$id" params={{ id: funnel.shortId }} target="_blank" />}
          >
            Share
          </Button>
          {isAdmin && (
            <Button
              disabled={funnel.published || publishMutation.isPending}
              variant={funnel.published ? 'ghost' : 'default'}
              onClick={() => {
                publishMutation.mutate(undefined, {
                  onSuccess: () => {
                    queryClient.invalidateQueries(getFunnelQueryOptions(params.workspaceId, params.id))
                  },
                })
              }}
            >
              Publish
            </Button>
          )}
        </div>
      </div>
      <Outlet />
    </div>
  )
}
