import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconChevronLeft as ChevronLeftIcon } from '@tabler/icons-react'
import { mutationOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, linkOptions, MatchRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { getFunnelQueryOptions } from '../-common'

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

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel')({
  component: RouteComponent,
  ssr: false,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getFunnelQueryOptions(params.workspaceId, params.id))
  },
})

const tabs = [
  { title: 'Edit', linkOptions: linkOptions({ from: Route.fullPath, to: './edit' }) },
  { title: 'Insights', linkOptions: linkOptions({ from: Route.fullPath, to: './insights' }) },
  { title: 'Responses', linkOptions: linkOptions({ from: Route.fullPath, to: './responses' }) },
]

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const funnelQuery = useSuspenseQuery(getFunnelQueryOptions(params.workspaceId, params.id))
  const funnel = funnelQuery.data

  const publishMutation = useMutation(publishFunnelMutationOptions(params.workspaceId, params.id))
  const updateTitleMutation = useMutation(updateFunnelTitleMutationOptions(params.workspaceId, params.id))

  const [editTitleOpen, setEditTitleOpen] = React.useState(false)
  const [titleValue, setTitleValue] = React.useState(funnel.title)
  const [titleError, setTitleError] = React.useState<string | null>(null)

  const handleTitleOpenChange = (open: boolean) => {
    setEditTitleOpen(open)
    if (open) {
      setTitleValue(funnel.title)
      setTitleError(null)
    }
  }

  const handleTitleSave = () => {
    const trimmedTitle = titleValue.trim()
    if (!trimmedTitle) {
      setTitleError('Title cannot be empty')
      return
    }
    updateTitleMutation.mutate(trimmedTitle, {
      onSuccess: () => {
        queryClient.invalidateQueries(getFunnelQueryOptions(params.workspaceId, params.id))
        setEditTitleOpen(false)
      },
    })
  }

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
          <Dialog.Root open={editTitleOpen} onOpenChange={handleTitleOpenChange}>
            <Dialog.Trigger aria-label="Edit funnel title" render={<Button variant="ghost">{funnel.title}</Button>} />
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Edit funnel title</Dialog.Title>
              </Dialog.Header>
              <Field.Root data-invalid={!!titleError}>
                <Input
                  autoFocus
                  placeholder="Enter funnel title"
                  value={titleValue}
                  onValueChange={(value) => {
                    setTitleValue(value)
                    if (titleError) setTitleError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleTitleSave()
                    }
                  }}
                />
                {titleError && <Field.Error>{titleError}</Field.Error>}
              </Field.Root>
              <Dialog.Footer>
                <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
                <Button onClick={handleTitleSave} disabled={updateTitleMutation.isPending}>
                  {updateTitleMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Root>
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
        </div>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            aria-label="Preview"
            render={<Link from={Route.fullPath} to="preview" target="_blank" />}
          >
            Preview
          </Button>
          <Button
            variant="ghost"
            aria-label="Share"
            render={<Link to="/f/$id" params={{ id: funnel.shortId }} target="_blank" />}
          >
            Share
          </Button>
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
        </div>
      </div>
      <Outlet />
    </div>
  )
}
