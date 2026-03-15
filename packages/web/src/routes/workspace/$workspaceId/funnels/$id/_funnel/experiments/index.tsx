import { DataGrid } from '@/components/data-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { withActor } from '@/context/auth.withActor'
import { getSessionQueryOptions } from '@/routes/workspace/$workspaceId/-common'
import { Heading } from '@/routes/workspace/$workspaceId/_dashboard/-components/heading'
import { listVariantsQueryOptions } from '@/routes/workspace/$workspaceId/funnels/$id/-common'
import { TrafficSplitInput } from '@/routes/workspace/$workspaceId/funnels/$id/_funnel/experiments/-traffic-split-input'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconFlask as FlaskIcon, IconPlus as PlusIcon } from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { formatDistanceToNow } from 'date-fns'
import * as React from 'react'
import { z } from 'zod'

const createExperimentFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
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
          name: data.name,
          variants: data.variants,
        }),
      data.workspaceId,
    )
  })

const listExperiments = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.listExperiments(data.funnelId), data.workspaceId)
  })

const listExperimentsQueryOptions = (input: { workspaceId: string; funnelId: string }) =>
  queryOptions({
    queryKey: ['experiments', input.workspaceId, input.funnelId],
    queryFn: () => listExperiments({ data: input }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel/experiments/')({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const session = await context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId))
    if (!session.isAdmin) {
      throw redirect({ to: '/workspace/$workspaceId/funnels/$id/responses', params })
    }
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        listExperimentsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
      ),
      context.queryClient.ensureQueryData(
        listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
      ),
    ])
  },
})

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'started':
      return (
        <Badge className="border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          Started
        </Badge>
      )
    case 'ended':
      return (
        <Badge className="border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Ended
        </Badge>
      )
    case 'draft':
    default:
      return <Badge variant="secondary">Draft</Badge>
  }
}

function RouteComponent() {
  const params = Route.useParams()

  const experimentsQuery = useSuspenseQuery(
    listExperimentsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
  )
  const experiments = experimentsQuery.data

  const [dialogOpen, setDialogOpen] = React.useState(false)

  return (
    <div className="p-6 sm:pt-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Heading.Root>
          <Heading.Content>
            <Heading.Title>Experiments</Heading.Title>
          </Heading.Content>
          <Heading.Actions>
            <Button size="lg" onClick={() => setDialogOpen(true)}>
              <PlusIcon />
              Create experiment
            </Button>
          </Heading.Actions>
        </Heading.Root>

        {experiments.length === 0 ? (
          <div className="rounded-3xl bg-muted p-2">
            <Card.Root>
              <Card.Content>
                <Empty.Root>
                  <Empty.Header>
                    <Empty.Media variant="icon">
                      <FlaskIcon />
                    </Empty.Media>
                    <Empty.Title>No experiments yet</Empty.Title>
                    <Empty.Description>
                      Create your first experiment to start testing different variants.
                    </Empty.Description>
                  </Empty.Header>
                </Empty.Root>
              </Card.Content>
            </Card.Root>
          </div>
        ) : (
          <DataGrid.Root className="grid-cols-[auto_auto_auto_auto]">
            <DataGrid.Header>
              <DataGrid.Head>Name</DataGrid.Head>
              <DataGrid.Head>Status</DataGrid.Head>
              <DataGrid.Head hideOnMobile>Started</DataGrid.Head>
              <DataGrid.Head hideOnMobile>Ended</DataGrid.Head>
            </DataGrid.Header>
            <DataGrid.Body>
              {experiments.map((experiment) => (
                <DataGrid.Row
                  key={experiment.id}
                  render={<Link from={Route.fullPath} to="./$experimentId" params={{ experimentId: experiment.id }} />}
                >
                  <DataGrid.Cell>
                    <span className="truncate text-sm font-medium">{experiment.name}</span>
                  </DataGrid.Cell>
                  <DataGrid.Cell>
                    <StatusBadge status={experiment.status} />
                  </DataGrid.Cell>
                  <DataGrid.Cell hideOnMobile>
                    <span className="text-sm text-muted-foreground">
                      {experiment.startedAt && formatDistanceToNow(experiment.startedAt, { addSuffix: true })}
                    </span>
                  </DataGrid.Cell>
                  <DataGrid.Cell hideOnMobile>
                    <span className="text-sm text-muted-foreground">
                      {experiment.endedAt && formatDistanceToNow(experiment.endedAt, { addSuffix: true })}
                    </span>
                  </DataGrid.Cell>
                </DataGrid.Row>
              ))}
            </DataGrid.Body>
          </DataGrid.Root>
        )}

        <CreateExperimentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    </div>
  )
}

function CreateExperimentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const variantsQuery = useSuspenseQuery(
    listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
  )
  const variants = variantsQuery.data

  const [name, setName] = React.useState('')
  const [nameError, setNameError] = React.useState<string | null>(null)
  const [weights, setWeights] = React.useState<{ funnelVariantId: string; weight: number }[]>(
    variants.filter((v) => v.isMain).map((v) => ({ funnelVariantId: v.id, weight: 0 })),
  )

  const mutation = useMutation({
    mutationFn: () =>
      createExperimentFn({
        data: {
          workspaceId: params.workspaceId,
          funnelId: params.id,
          name,
          variants: weights,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(
        listExperimentsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
      )
      onOpenChange(false)
    },
  })

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)
  const isValid = name.trim().length > 0 && weights.length >= 2 && totalWeight === 100

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setName('')
      setNameError(null)
      setWeights(variants.filter((v) => v.isMain).map((v) => ({ funnelVariantId: v.id, weight: 0 })))
    }
    onOpenChange(nextOpen)
  }

  const handleCreate = () => {
    if (!name.trim()) {
      setNameError('Name is required')
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content className="sm:max-w-md">
        <Dialog.Header>
          <Dialog.Title>Create experiment</Dialog.Title>
          <Dialog.Description>
            Give the experiment a name and assign a traffic weight to each variant. Weights must sum to 100%.
          </Dialog.Description>
        </Dialog.Header>

        <div className="flex flex-col gap-4">
          <Field.Root data-invalid={!!nameError}>
            <Field.Label>Name</Field.Label>
            <Input
              autoFocus
              placeholder="Experiment name"
              value={name}
              onValueChange={(value) => {
                setName(value)
                if (nameError) setNameError(null)
              }}
            />
            <Field.Error>{nameError}</Field.Error>
          </Field.Root>

          <TrafficSplitInput variants={variants} weights={weights} onWeightsChange={setWeights} />
        </div>

        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button onClick={handleCreate} disabled={!isValid || mutation.isPending}>
            {mutation.isPending && <Spinner />}
            Create
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}
