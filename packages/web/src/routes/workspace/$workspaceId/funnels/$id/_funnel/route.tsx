import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Item } from '@/components/ui/item'
import { Menu } from '@/components/ui/menu'
import { Popover } from '@/components/ui/popover'
import { Tooltip } from '@/components/ui/tooltip'
import { withActor } from '@/context/auth.withActor'
import { snackbar } from '@/lib/snackbar'
import { cn } from '@/lib/utils'
import { getSessionQueryOptions } from '@/routes/workspace/$workspaceId/-common'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import {
  IconCheck as CheckIcon,
  IconChevronDown as ChevronDownIcon,
  IconChevronLeft as ChevronLeftIcon,
  IconLoader2 as LoaderIcon,
  IconStarFilled as StarFilledIcon,
} from '@tabler/icons-react'
import { mutationOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  linkOptions,
  MatchRoute,
  notFound,
  Outlet,
  redirect,
  retainSearchParams,
  useBlocker,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { formatDistanceToNow } from 'date-fns'
import * as React from 'react'
import { z } from 'zod'
import { getFunnelVariantDraftQueryOptions, listVariantsQueryOptions } from '../-common'
import { createFunnelCollection } from './-common'
import { FunnelProvider, useFunnel } from './-context'
import { VariantCreateDialog } from './-variant-create-dialog'
import { SchemaButton } from './edit/-components/schema-button'

const publishFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant'),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () => Funnel.publishVariant({ funnelId: data.funnelId, funnelVariantId: data.funnelVariantId }),
      data.workspaceId,
    )
  })

const publishFunnelMutationOptions = (workspaceId: string, funnelId: string, funnelVariantId: string) =>
  mutationOptions({
    mutationFn: () => publishFunnel({ data: { workspaceId, funnelId, funnelVariantId } }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel')({
  component: RouteComponent,
  validateSearch: z.object({
    variant: z.string().optional(),
  }),
  search: {
    middlewares: [retainSearchParams(['variant'])],
  },
  loaderDeps: ({ search }) => ({ variant: search.variant }),
  loader: async ({ context, params, deps }) => {
    const [variants] = await Promise.all([
      context.queryClient.ensureQueryData(
        listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
      ),
      context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId)),
    ])

    if (!deps.variant) {
      const mainVariant = variants.find((v) => v.isMain)
      if (!mainVariant) throw notFound()

      throw redirect({
        to: '.',
        search: { variant: mainVariant.id },
        replace: true,
      })
    }

    const funnelCollection = createFunnelCollection(params.workspaceId, params.id, deps.variant, context.queryClient)
    await funnelCollection.preload()

    return { funnelCollection, activeVariantId: deps.variant }
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

  const publishMutation = useMutation(
    publishFunnelMutationOptions(params.workspaceId, params.id, funnel.data.variantId),
  )

  const handlePublish = async () => {
    setIsPublishing(true)
    await publishMutation.mutateAsync()
    await queryClient.invalidateQueries(
      getFunnelVariantDraftQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
    )
    setIsPublishing(false)
    snackbar.add({ title: 'Funnel published', type: 'success' })
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(funnel.data.url)
    snackbar.add({ title: 'Link copied to clipboard', type: 'success' })
  }

  return (
    <ButtonGroup.Root className="min-w-28">
      <Tooltip.Root disabled={funnel.data.hasChanges || isPublishing}>
        <Tooltip.Trigger
          render={
            <Button
              className={cn(
                'flex-1',
                isPublishing && 'pointer-events-none',
                !funnel.data.hasChanges && !funnel.isSaving && 'opacity-50',
              )}
              disabled={funnel.isSaving}
              onClick={funnel.data.hasChanges ? handlePublish : undefined}
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
  if (!funnel.data.hasChanges) return null
  return <Badge variant="secondary">Draft</Badge>
}

function PreviewButton() {
  const { data: funnel } = useFunnel()
  return (
    <Button
      variant="ghost"
      aria-label="Preview"
      nativeButton={false}
      render={<Link from={Route.fullPath} to="preview" search={{ variant: funnel.variantId }} target="_blank" />}
    >
      Preview
    </Button>
  )
}

function VariantSwitcher() {
  const params = Route.useParams()
  const search = Route.useSearch()

  const variantsQuery = useSuspenseQuery(
    listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
  )
  const variants = variantsQuery.data

  const activeVariant = variants.find((v) => v.id === search.variant)

  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [variantCreateHandle] = React.useState(() => VariantCreateDialog.createHandle())

  const handleClosePopover = () => setPopoverOpen(false)

  return (
    <>
      <span className="text-muted-foreground">/</span>
      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Popover.Trigger
          render={
            <Button variant="ghost" className="gap-1.5">
              <span className="max-w-32 truncate">{activeVariant?.title ?? 'Unknown'}</span>
              {activeVariant && activeVariant.trafficPercentage > 0 && (
                <Badge className="border-transparent bg-green-100 text-xs text-green-950 tabular-nums">
                  Live {activeVariant.trafficPercentage}%
                </Badge>
              )}
              <ChevronDownIcon className="size-3.5" />
            </Button>
          }
        />
        <Popover.Content align="start" className="max-w-[600px] min-w-[380px] p-0">
          <div className="flex flex-col">
            <div className="flex max-h-64 flex-col overflow-y-auto p-0.5">
              {variants.map((variant) => (
                <Item.Root
                  key={variant.id}
                  size="xs"
                  className={cn('cursor-pointer hover:bg-accent', variant.id === search.variant && 'bg-accent/50')}
                  render={
                    <Link
                      from={Route.fullPath}
                      unsafeRelative="path"
                      search={{ variant: variant.id }}
                      onClick={handleClosePopover}
                    />
                  }
                >
                  <Item.Content>
                    <Item.Title className="flex items-center gap-1.5">
                      <span className="truncate">{variant.title}</span>
                      {variant.isMain && <StarFilledIcon className="size-3.5 shrink-0 text-amber-500" />}
                      {variant.trafficPercentage > 0 && (
                        <Badge className="shrink-0 border-transparent bg-green-100 text-xs text-green-950">
                          Live {variant.trafficPercentage}%
                        </Badge>
                      )}
                    </Item.Title>
                  </Item.Content>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(variant.updatedAt, { addSuffix: false })} ago
                  </span>
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {variant.id === search.variant && <CheckIcon className="size-3.5" />}
                  </span>
                </Item.Root>
              ))}
            </div>
            <div className="border-t border-border p-2">
              <Dialog.Trigger
                handle={variantCreateHandle}
                render={<Button variant="outline" className="w-full" />}
                onClick={() => setPopoverOpen(false)}
              >
                Create new branch
              </Dialog.Trigger>
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
      <VariantCreateDialog handle={variantCreateHandle} />
    </>
  )
}

const tabs = [
  { title: 'Edit', linkOptions: linkOptions({ from: Route.fullPath, to: './edit' }), adminOnly: true },
  { title: 'Insights', linkOptions: linkOptions({ from: Route.fullPath, to: './insights' }), adminOnly: false },
  { title: 'Responses', linkOptions: linkOptions({ from: Route.fullPath, to: './responses' }), adminOnly: false },
]

function RouteComponent() {
  const params = Route.useParams()
  const { funnelCollection, activeVariantId } = Route.useLoaderData()

  const sessionQuery = useSuspenseQuery(getSessionQueryOptions(params.workspaceId))
  const session = sessionQuery.data

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || session.isAdmin)

  return (
    <FunnelProvider collection={funnelCollection} activeVariantId={activeVariantId}>
      <NavigationBlocker />
      <div
        className="flex min-h-screen w-screen flex-col"
        style={{ '--dashboard-header-height': '3rem' } as React.CSSProperties}
      >
        <div className="sticky top-0 z-10 grid h-(--dashboard-header-height) w-full shrink-0 grid-cols-3 items-center border-b border-border bg-background px-2">
          <div className="flex items-center">
            <Button
              nativeButton={false}
              variant="ghost"
              size="icon"
              render={<Link from={Route.fullPath} to="../../funnels" />}
            >
              <ChevronLeftIcon />
            </Button>
            <Title />
            {session.isAdmin && <VariantSwitcher />}
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
            {session.isAdmin && <Settings />}
            {session.isAdmin && (
              <Button variant="ghost" nativeButton={false} render={<Link from={Route.fullPath} to="./variants" />}>
                Variants
              </Button>
            )}
            {session.isAdmin && (
              <Button variant="ghost" nativeButton={false} render={<Link from={Route.fullPath} to="./experiments" />}>
                Experiments
              </Button>
            )}
            {session.isSuperAdmin && <SchemaButton />}
          </div>
          <div className="flex items-center justify-end gap-2">
            <DraftBadge />
            {session.isAdmin && <PreviewButton />}
            {session.isAdmin && <PublishButton />}
          </div>
        </div>
        <Outlet />
      </div>
    </FunnelProvider>
  )
}
