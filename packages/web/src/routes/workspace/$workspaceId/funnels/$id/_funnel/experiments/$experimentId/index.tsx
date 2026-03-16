import { DataGrid } from '@/components/data-grid'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { withActor } from '@/context/auth.withActor'
import { Heading } from '@/routes/workspace/$workspaceId/_dashboard/-components/heading'
import { listVariantsQueryOptions } from '@/routes/workspace/$workspaceId/funnels/$id/-common'
import { listExperimentsQueryOptions } from '@/routes/workspace/$workspaceId/funnels/$id/_funnel/experiments/-common'
import { TrafficSplitInput } from '@/routes/workspace/$workspaceId/funnels/$id/_funnel/experiments/-traffic-split-input'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import {
  IconArrowsSplit as ArrowsSplitIcon,
  IconChartBar as ChartBarIcon,
  IconPlayerPlayFilled as PlayerPlayFilledIcon,
  IconPlayerStopFilled as PlayerStopFilledIcon,
  IconTrophy as TrophyIcon,
} from '@tabler/icons-react'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { getExperimentQueryOptions } from './-common'

const startExperimentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      experimentId: Identifier.schema('funnel_experiment'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.startExperiment(data.experimentId), data.workspaceId)
  })

const endExperimentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      experimentId: Identifier.schema('funnel_experiment'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.endExperiment(data.experimentId), data.workspaceId)
  })

const selectWinnerFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      experimentId: Identifier.schema('funnel_experiment'),
      funnelVariantId: Identifier.schema('funnel_variant'),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Funnel.selectExperimentWinner({
          experimentId: data.experimentId,
          funnelVariantId: data.funnelVariantId,
        }),
      data.workspaceId,
    )
  })

const updateTrafficSplitFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      experimentId: Identifier.schema('funnel_experiment'),
      name: z.string().min(1).max(255),
      variants: z.array(
        z.object({
          funnelVariantId: z.string(),
          weight: z.number().int().min(0).max(100),
        }),
      ),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Funnel.upsertExperiment({
          funnelId: data.funnelId,
          experimentId: data.experimentId,
          name: data.name,
          variants: data.variants,
        }),
      data.workspaceId,
    )
  })

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel/experiments/$experimentId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const experimentQuery = useSuspenseQuery(
    getExperimentQueryOptions({ workspaceId: params.workspaceId, experimentId: params.experimentId }),
  )
  const experiment = experimentQuery.data
  if (!experiment) return null

  const startMutation = useMutation({
    mutationFn: () =>
      startExperimentFn({
        data: {
          workspaceId: params.workspaceId,
          experimentId: params.experimentId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(
        getExperimentQueryOptions({ workspaceId: params.workspaceId, experimentId: params.experimentId }),
      )
    },
  })

  const endMutation = useMutation({
    mutationFn: () =>
      endExperimentFn({
        data: {
          workspaceId: params.workspaceId,
          experimentId: params.experimentId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(
        getExperimentQueryOptions({ workspaceId: params.workspaceId, experimentId: params.experimentId }),
      )
    },
  })

  const selectWinnerMutation = useMutation({
    mutationFn: (funnelVariantId: string) =>
      selectWinnerFn({
        data: {
          workspaceId: params.workspaceId,
          experimentId: params.experimentId,
          funnelVariantId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(
        getExperimentQueryOptions({ workspaceId: params.workspaceId, experimentId: params.experimentId }),
      )
      queryClient.invalidateQueries(
        listExperimentsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
      )
      queryClient.invalidateQueries(listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }))
    },
  })

  const [editDialogOpen, setEditDialogOpen] = React.useState(false)

  return (
    <div className="p-6 sm:pt-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Heading.Root>
          <Heading.Content>
            <Heading.Title>{experiment.name}</Heading.Title>
          </Heading.Content>
          <Heading.Actions>
            <Button variant="outline" render={<Link from={Route.fullPath} to="./analytics" />}>
              <ChartBarIcon />
              Analytics
            </Button>
            {experiment.status !== 'ended' && (
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                <ArrowsSplitIcon />
                Edit traffic split
              </Button>
            )}
            {experiment.status === 'draft' && (
              <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
                {startMutation.isPending ? <Spinner /> : <PlayerPlayFilledIcon />}
                Start
              </Button>
            )}
            {experiment.status === 'started' && (
              <Button variant="outline" onClick={() => endMutation.mutate()} disabled={endMutation.isPending}>
                {endMutation.isPending ? <Spinner /> : <PlayerStopFilledIcon />}
                Stop
              </Button>
            )}
          </Heading.Actions>
        </Heading.Root>

        <DataGrid.Root className="grid-cols-[auto_auto_auto]">
          <DataGrid.Header>
            <DataGrid.Head>Variant</DataGrid.Head>
            <DataGrid.Head>Traffic split</DataGrid.Head>
            <DataGrid.Head srOnly>Actions</DataGrid.Head>
          </DataGrid.Header>
          <DataGrid.Body>
            {experiment.variants.map((variant) => (
              <DataGrid.Row key={variant.funnelVariantId}>
                <DataGrid.Cell>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{variant.variantTitle}</span>
                    {variant.isWinner && <TrophyIcon className="size-4 text-amber-600" />}
                  </div>
                </DataGrid.Cell>
                <DataGrid.Cell>
                  <span className="text-sm text-muted-foreground">{variant.weight}%</span>
                </DataGrid.Cell>
                <DataGrid.Cell>
                  {experiment.status === 'started' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectWinnerMutation.isPending}
                      onClick={() => selectWinnerMutation.mutate(variant.funnelVariantId)}
                    >
                      {selectWinnerMutation.isPending && selectWinnerMutation.variables === variant.funnelVariantId && (
                        <Spinner />
                      )}
                      Select winner
                    </Button>
                  )}
                </DataGrid.Cell>
              </DataGrid.Row>
            ))}
          </DataGrid.Body>
        </DataGrid.Root>

        <EditTrafficSplitDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} experiment={experiment} />
      </div>
    </div>
  )
}

function EditTrafficSplitDialog({
  open,
  onOpenChange,
  experiment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  experiment: { id: string; funnelId: string; name: string; variants: { funnelVariantId: string; weight: number }[] }
}) {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const variantsQuery = useSuspenseQuery(
    listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
  )
  const variants = variantsQuery.data

  const [weights, setWeights] = React.useState(
    experiment.variants.map((v) => ({ funnelVariantId: v.funnelVariantId, weight: v.weight })),
  )

  const mutation = useMutation({
    mutationFn: () =>
      updateTrafficSplitFn({
        data: {
          workspaceId: params.workspaceId,
          funnelId: experiment.funnelId,
          experimentId: experiment.id,
          name: experiment.name,
          variants: weights,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(
        getExperimentQueryOptions({ workspaceId: params.workspaceId, experimentId: params.experimentId }),
      )
      onOpenChange(false)
    },
  })

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)
  const isValid = weights.length >= 2 && totalWeight === 100

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setWeights(experiment.variants.map((v) => ({ funnelVariantId: v.funnelVariantId, weight: v.weight })))
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content className="sm:max-w-md">
        <Dialog.Header>
          <Dialog.Title>Edit traffic split</Dialog.Title>
          <Dialog.Description>Adjust the traffic weight for each variant. Weights must sum to 100%.</Dialog.Description>
        </Dialog.Header>

        <TrafficSplitInput variants={variants} weights={weights} onWeightsChange={setWeights} />

        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button onClick={() => mutation.mutate()} disabled={!isValid || mutation.isPending}>
            {mutation.isPending && <Spinner />}
            Save
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}
