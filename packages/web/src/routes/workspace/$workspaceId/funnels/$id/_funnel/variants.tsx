import { DataGrid } from '@/components/data-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { withActor } from '@/context/auth.withActor'
import { getSessionQueryOptions } from '@/routes/workspace/$workspaceId/-common'
import { Heading } from '@/routes/workspace/$workspaceId/_dashboard/-components/heading'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { TrafficSplit } from '@shopfunnel/core/funnel/types'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconPencil as PencilIcon } from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { formatDistanceToNow } from 'date-fns'
import * as React from 'react'
import { z } from 'zod'

const listVariants = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.listVariants(data.funnelId), data.workspaceId)
  })

const listVariantsQueryOptions = (input: { workspaceId: string; funnelId: string }) =>
  queryOptions({
    queryKey: ['variants', input.workspaceId, input.funnelId],
    queryFn: () => listVariants({ data: input }),
  })

const releaseFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      trafficSplit: z.array(
        z.object({
          funnelVariantId: z.string(),
          percentage: z.number().int().min(0).max(100),
        }),
      ),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () => Funnel.release({ funnelId: data.funnelId, trafficSplit: data.trafficSplit }),
      data.workspaceId,
    )
  })

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel/variants')({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const session = await context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId))
    if (!session.isAdmin) {
      throw redirect({ to: '/workspace/$workspaceId/funnels/$id/responses', params })
    }
  },
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
    )
  },
})

function TrafficSplitDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const variantsQuery = useSuspenseQuery(
    listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
  )
  const variants = variantsQuery.data

  const [trafficSplit, setTrafficSplit] = React.useState<TrafficSplit[]>(
    variants.map((v) => ({ funnelVariantId: v.id, percentage: v.trafficPercentage })),
  )

  const mutation = useMutation({
    mutationFn: () =>
      releaseFunnel({
        data: {
          workspaceId: params.workspaceId,
          funnelId: params.id,
          trafficSplit,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }))
      onOpenChange(false)
    },
  })

  const totalPercentage = trafficSplit.reduce((sum, s) => sum + s.percentage, 0)
  const isValid = trafficSplit.length >= 1 && totalPercentage === 100

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="sm:max-w-[500px]">
        <Dialog.Header>
          <Dialog.Title>Traffic Split</Dialog.Title>
          <Dialog.Description>
            Dedicate a percentage of the traffic to each variant. The variant will be chosen randomly based on the
            percentages when a visitor arrives.
          </Dialog.Description>
        </Dialog.Header>

        <div className="flex flex-col gap-4">
          <div>
            <div className="relative z-10 divide-y divide-border overflow-hidden rounded-lg shadow-sm ring-1 ring-border">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="flex max-h-9 min-h-9 items-center justify-between gap-4 overflow-hidden pr-0 pl-1"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-1">
                    <div className="w-7" />
                    <p className="truncate text-sm font-medium text-foreground">{variant.title}</p>
                    {variant.isOriginal && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        Original
                      </Badge>
                    )}
                  </span>
                  <div
                    className="flex max-h-9 min-h-9 shrink-0 cursor-text items-center gap-2 border-l border-border pr-4 transition-colors focus-within:bg-muted/50 hover:bg-muted/50"
                    onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
                  >
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="h-8 w-14 [appearance:textfield] border-0 bg-transparent pr-4 pl-2 text-end shadow-none! focus-visible:ring-0 focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={String(trafficSplit.find((s) => s.funnelVariantId === variant.id)?.percentage ?? 0)}
                        onValueChange={(value) =>
                          setTrafficSplit((prev) =>
                            prev.map((s) =>
                              s.funnelVariantId === variant.id ? { ...s, percentage: Number(value) || 0 } : s,
                            ),
                          )
                        }
                      />
                      <span className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                    <PencilIcon className="size-4 shrink-0 text-muted-foreground/50" />
                  </div>
                </div>
              ))}
            </div>
            {variants.length > 0 && (
              <div
                className={`mx-4 flex h-8 items-center justify-center rounded-b-lg border-r border-b border-l border-border px-4 py-3 ${
                  totalPercentage === 100 ? 'bg-muted' : 'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <p
                  className={`text-xs font-medium ${
                    totalPercentage === 100 ? 'text-muted-foreground' : 'text-red-800 dark:text-red-400'
                  }`}
                >
                  Total traffic {totalPercentage}%
                </p>
              </div>
            )}
          </div>
        </div>

        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button onClick={() => mutation.mutate()} disabled={!isValid || mutation.isPending}>
            {mutation.isPending && <Spinner />}
            Release
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const variantsQuery = useSuspenseQuery(
    listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
  )
  const variants = variantsQuery.data

  const [trafficSplitDialogOpen, setTrafficSplitDialogOpen] = React.useState(false)

  const rolloutMutation = useMutation({
    mutationFn: (funnelVariantId: string) =>
      releaseFunnel({
        data: {
          workspaceId: params.workspaceId,
          funnelId: params.id,
          trafficSplit: variants.map((v) => ({
            funnelVariantId: v.id,
            percentage: v.id === funnelVariantId ? 100 : 0,
          })),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }))
    },
  })

  return (
    <div className="p-6 sm:pt-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Heading.Root>
          <Heading.Content>
            <Heading.Title>Variants</Heading.Title>
          </Heading.Content>
          <Heading.Actions>
            <Button variant="outline" onClick={() => setTrafficSplitDialogOpen(true)}>
              Edit Traffic Split
            </Button>
          </Heading.Actions>
        </Heading.Root>

        <DataGrid.Root className="grid-cols-[1fr_auto_auto_auto]">
          <DataGrid.Header>
            <DataGrid.Head>Title</DataGrid.Head>
            <DataGrid.Head>Traffic Split</DataGrid.Head>
            <DataGrid.Head hideOnMobile>Updated</DataGrid.Head>
            <DataGrid.Head srOnly>Actions</DataGrid.Head>
          </DataGrid.Header>
          <DataGrid.Body>
            {variants.map((variant) => (
              <DataGrid.Row key={variant.id}>
                <DataGrid.Cell>
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{variant.title}</span>
                    {variant.isOriginal && (
                      <Badge variant="outline" className="shrink-0">
                        Original
                      </Badge>
                    )}
                  </span>
                </DataGrid.Cell>
                <DataGrid.Cell>
                  {variant.trafficPercentage > 0 ? (
                    <Badge className="border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Live {variant.trafficPercentage}%
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">0%</span>
                  )}
                </DataGrid.Cell>
                <DataGrid.Cell hideOnMobile>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(variant.updatedAt, { addSuffix: true })}
                  </span>
                </DataGrid.Cell>
                <DataGrid.Cell>
                  {variant.trafficPercentage < 100 && variant.trafficPercentage > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={rolloutMutation.isPending}
                      onClick={() => rolloutMutation.mutate(variant.id)}
                    >
                      Rollout
                    </Button>
                  )}
                </DataGrid.Cell>
              </DataGrid.Row>
            ))}
          </DataGrid.Body>
        </DataGrid.Root>

        <TrafficSplitDialog open={trafficSplitDialogOpen} onOpenChange={setTrafficSplitDialogOpen} />
      </div>
    </div>
  )
}
