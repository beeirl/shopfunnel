import { DataGrid } from '@/components/data-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { withActor } from '@/context/auth.withActor'
import { getSessionQueryOptions } from '@/routes/workspace/$workspaceId/-common'
import { Heading } from '@/routes/workspace/$workspaceId/_dashboard/-components/heading'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconPencil as PencilIcon, IconPlus as PlusIcon } from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { formatDistanceToNow } from 'date-fns'
import * as React from 'react'
import { z } from 'zod'

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

const createExperiment = createServerFn({ method: 'POST' })
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

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel/experiments')({
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
    variants.map((v) => ({ funnelVariantId: v.id, weight: 0 })),
  )

  const mutation = useMutation({
    mutationFn: () =>
      createExperiment({
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
  const isValid = name.trim().length > 0 && weights.length >= 1 && totalWeight === 100

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (nextOpen) {
      setName('')
      setNameError(null)
      setWeights(variants.map((v) => ({ funnelVariantId: v.id, weight: 0 })))
    }
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
      <Dialog.Content className="sm:max-w-[500px]">
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
                    {variant.isMain && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        Main
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
                        value={String(weights.find((w) => w.funnelVariantId === variant.id)?.weight ?? 0)}
                        onValueChange={(value) =>
                          setWeights((prev) =>
                            prev.map((w) =>
                              w.funnelVariantId === variant.id ? { ...w, weight: Number(value) || 0 } : w,
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
                  totalWeight === 100 ? 'bg-muted' : 'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <p
                  className={`text-xs font-medium ${
                    totalWeight === 100 ? 'text-muted-foreground' : 'text-red-800 dark:text-red-400'
                  }`}
                >
                  Total traffic {totalWeight}%
                </p>
              </div>
            )}
          </div>
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

function RouteComponent() {
  const params = Route.useParams()

  const experimentsQuery = useSuspenseQuery(
    listExperimentsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
  )
  const experiments = experimentsQuery.data

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

  return (
    <div className="p-6 sm:pt-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Heading.Root>
          <Heading.Content>
            <Heading.Title>Experiments</Heading.Title>
          </Heading.Content>
          <Heading.Actions>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon />
              Create experiment
            </Button>
          </Heading.Actions>
        </Heading.Root>

        <DataGrid.Root className="grid-cols-[1fr_auto_auto_auto]">
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
                    {experiment.startedAt ? formatDistanceToNow(experiment.startedAt, { addSuffix: true }) : '\u2014'}
                  </span>
                </DataGrid.Cell>
                <DataGrid.Cell hideOnMobile>
                  <span className="text-sm text-muted-foreground">
                    {experiment.endedAt ? formatDistanceToNow(experiment.endedAt, { addSuffix: true }) : '\u2014'}
                  </span>
                </DataGrid.Cell>
              </DataGrid.Row>
            ))}
          </DataGrid.Body>
        </DataGrid.Root>

        <CreateExperimentDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    </div>
  )
}
