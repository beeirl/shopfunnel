import { DataGrid } from '@/components/data-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { withActor } from '@/context/auth.withActor'
import { getSessionQueryOptions } from '@/routes/workspace/$workspaceId/-common'
import { Heading } from '@/routes/workspace/$workspaceId/_dashboard/-components/heading'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const getExperiment = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      experimentId: Identifier.schema('funnel_experiment'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.getExperiment(data.experimentId), data.workspaceId)
  })

const getExperimentQueryOptions = (input: { workspaceId: string; experimentId: string }) =>
  queryOptions({
    queryKey: ['experiment', input.workspaceId, input.experimentId],
    queryFn: () => getExperiment({ data: input }),
  })

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

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel/experiments/$experimentId')({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const session = await context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId))
    if (!session.isAdmin) {
      throw redirect({ to: '/workspace/$workspaceId/funnels/$id/responses', params })
    }
  },
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      getExperimentQueryOptions({ workspaceId: params.workspaceId, experimentId: params.experimentId }),
    )
  },
})

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return (
        <Badge className="border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Running
        </Badge>
      )
    case 'completed':
      return <Badge variant="secondary">Completed</Badge>
    case 'draft':
    default:
      return <Badge variant="outline">Draft</Badge>
  }
}

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
    },
  })

  const isRunning = experiment.status === 'running'
  const isCompleted = experiment.status === 'completed'
  const isDraft = experiment.status === 'draft'

  return (
    <div className="p-6 sm:pt-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Heading.Root>
          <Heading.Content>
            <Heading.Title>{experiment.name}</Heading.Title>
            <div className="mt-1">
              <StatusBadge status={experiment.status} />
            </div>
          </Heading.Content>
          <Heading.Actions>
            {isDraft && (
              <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
                {startMutation.isPending && <Spinner />}
                Start
              </Button>
            )}
            {isRunning && (
              <Button variant="outline" onClick={() => endMutation.mutate()} disabled={endMutation.isPending}>
                {endMutation.isPending && <Spinner />}
                Stop
              </Button>
            )}
          </Heading.Actions>
        </Heading.Root>

        <DataGrid.Root className="grid-cols-[1fr_auto_auto]">
          <DataGrid.Header>
            <DataGrid.Head>Variant</DataGrid.Head>
            <DataGrid.Head>Traffic split</DataGrid.Head>
            <DataGrid.Head srOnly>Actions</DataGrid.Head>
          </DataGrid.Header>
          <DataGrid.Body>
            {experiment.variants.map((variant) => (
              <DataGrid.Row key={variant.funnelVariantId}>
                <DataGrid.Cell>
                  <span className="truncate text-sm font-medium">{variant.variantTitle}</span>
                </DataGrid.Cell>
                <DataGrid.Cell>
                  <span className="text-sm text-muted-foreground">{variant.weight}%</span>
                </DataGrid.Cell>
                <DataGrid.Cell>
                  {isRunning && (
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
      </div>
    </div>
  )
}
