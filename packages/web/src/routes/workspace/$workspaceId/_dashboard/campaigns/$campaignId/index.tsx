import { DataGrid } from '@/components/data-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Menu } from '@/components/ui/menu'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { withActor } from '@/context/auth.withActor'
import { snackbar } from '@/lib/snackbar'
import { toast } from '@/lib/toast'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Actor } from '@shopfunnel/core/actor'
import { Campaign } from '@shopfunnel/core/campaign/index'
import { CampaignFunnelTable, CampaignTable } from '@shopfunnel/core/campaign/index.sql'
import { Database } from '@shopfunnel/core/database/index'
import { DomainTable } from '@shopfunnel/core/domain/index.sql'
import {
  ExperimentAlreadyActiveError,
  ExperimentAlreadyEndedError,
  ExperimentInvalidWeightsError,
  ExperimentNotStartedError,
  ExperimentVariantInvalidError,
  ExperimentVariantNotPublishedError,
} from '@shopfunnel/core/experiment/error'
import { Experiment } from '@shopfunnel/core/experiment/index'
import { ExperimentTable, ExperimentVariantTable } from '@shopfunnel/core/experiment/index.sql'
import { FunnelTable } from '@shopfunnel/core/funnel/index.sql'
import { Identifier } from '@shopfunnel/core/identifier'
import {
  IconArrowBigUpLines as ArrowBigUpLinesIcon,
  IconCancel as CancelIcon,
  IconChartBar as ChartBarIcon,
  IconDots as DotsIcon,
  IconLink as LinkIcon,
  IconLoader2 as LoaderIcon,
  IconPencil as PencilIcon,
  IconPlus as PlusIcon,
  IconTargetArrow as TargetArrowIcon,
  IconTrophy as TrophyIcon,
  IconX as XIcon,
} from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import * as React from 'react'
import { z } from 'zod'
import { Heading } from '../../-components/heading'

const getCampaign = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      campaignId: Identifier.schema('campaign'),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      const campaign = await Database.use((tx) =>
        tx
          .select({
            campaignId: CampaignTable.id,
            campaignName: CampaignTable.name,
            campaignShortId: CampaignTable.shortId,
            domainHostname: DomainTable.hostname,
            defaultFunnelId: CampaignTable.defaultFunnelId,
            funnelId: FunnelTable.id,
            funnelTitle: FunnelTable.title,
            experimentId: ExperimentTable.id,
            experimentName: ExperimentTable.name,
            controlVariantId: ExperimentTable.controlVariantId,
            publishedVersion: FunnelTable.publishedVersion,
            experimentVariantId: ExperimentVariantTable.id,
            variantWeight: ExperimentVariantTable.weight,
          })
          .from(CampaignTable)
          .leftJoin(
            CampaignFunnelTable,
            and(
              eq(CampaignFunnelTable.workspaceId, CampaignTable.workspaceId),
              eq(CampaignFunnelTable.campaignId, CampaignTable.id),
            ),
          )
          .leftJoin(
            DomainTable,
            and(eq(DomainTable.workspaceId, CampaignTable.workspaceId), eq(DomainTable.id, CampaignTable.domainId)),
          )
          .leftJoin(
            FunnelTable,
            and(
              eq(FunnelTable.workspaceId, CampaignFunnelTable.workspaceId),
              eq(FunnelTable.id, CampaignFunnelTable.funnelId),
              isNull(FunnelTable.archivedAt),
            ),
          )
          .leftJoin(
            ExperimentTable,
            and(
              eq(ExperimentTable.workspaceId, CampaignTable.workspaceId),
              eq(ExperimentTable.campaignId, CampaignTable.id),
              isNotNull(ExperimentTable.startedAt),
              isNull(ExperimentTable.endedAt),
              isNull(ExperimentTable.archivedAt),
            ),
          )
          .leftJoin(
            ExperimentVariantTable,
            and(
              eq(ExperimentVariantTable.workspaceId, ExperimentTable.workspaceId),
              eq(ExperimentVariantTable.experimentId, ExperimentTable.id),
              eq(ExperimentVariantTable.funnelId, FunnelTable.id),
            ),
          )
          .where(
            and(
              eq(CampaignTable.workspaceId, Actor.workspace()),
              eq(CampaignTable.id, data.campaignId),
              isNull(CampaignTable.archivedAt),
            ),
          )
          .then((rows) => {
            if (rows.length === 0) return

            const first = rows[0]!
            const hasExperiment = first.experimentId !== null

            return {
              id: first.campaignId,
              name: first.campaignName,
              url: Campaign.getUrl(first.campaignShortId, first.domainHostname ?? undefined),
              activeExperiment: hasExperiment
                ? {
                    id: first.experimentId!,
                    name: first.experimentName!,
                  }
                : null,
              funnels: rows
                .filter((row) => row.funnelId !== null)
                .map((row) => ({
                  id: row.funnelId!,
                  title: row.funnelTitle!,
                  published: row.publishedVersion !== null,
                  weight: hasExperiment ? (row.variantWeight ?? 0) : row.funnelId === first.defaultFunnelId ? 100 : 0,
                  experimentVariantId: row.experimentVariantId,
                  isControlVariant: hasExperiment && row.experimentVariantId === first.controlVariantId,
                }))
                .sort((a, b) => {
                  if (a.isControlVariant !== b.isControlVariant) return a.isControlVariant ? -1 : 1
                  return b.weight - a.weight
                }),
            }
          }),
      )
      if (!campaign) throw notFound()
      return campaign
    }, data.workspaceId)
  })

const getCampaignQueryOptions = (workspaceId: string, campaignId: string) =>
  queryOptions({
    queryKey: ['campaign', workspaceId, campaignId],
    queryFn: () => getCampaign({ data: { workspaceId, campaignId } }),
  })

const selectWinner = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      experimentId: Identifier.schema('experiment'),
      experimentVariantId: Identifier.schema('experiment_variant'),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () => Experiment.selectWinner({ experimentId: data.experimentId, experimentVariantId: data.experimentVariantId }),
      data.workspaceId,
    )
  })

const stopExperiment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      experimentId: Identifier.schema('experiment'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Experiment.end(data.experimentId), data.workspaceId)
  })

const swapDefaultFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      campaignId: Identifier.schema('campaign'),
      funnelId: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () => Campaign.setDefaultFunnel({ id: data.campaignId, funnelId: data.funnelId }),
      data.workspaceId,
    )
  })

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard/campaigns/$campaignId/')({
  staticData: { title: 'Campaign' },
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getCampaignQueryOptions(params.workspaceId, params.campaignId))
  },
})

const createExperiment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      campaignId: Identifier.schema('campaign'),
      name: z.string().min(1).max(255),
      controlFunnelId: Identifier.schema('funnel'),
      variants: z.array(
        z.object({
          funnelId: Identifier.schema('funnel'),
          weight: z.number().int().min(0).max(100),
        }),
      ),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Experiment.create({
          campaignId: data.campaignId,
          name: data.name,
          controlFunnelId: data.controlFunnelId,
          variants: data.variants,
        }),
      data.workspaceId,
    )
  })

const updateExperiment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      id: Identifier.schema('experiment'),
      name: z.string().min(1).max(255),
      controlFunnelId: Identifier.schema('funnel'),
      variants: z.array(
        z.object({
          funnelId: Identifier.schema('funnel'),
          weight: z.number().int().min(0).max(100),
        }),
      ),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Experiment.update({
          id: data.id,
          name: data.name,
          controlFunnelId: data.controlFunnelId,
          variants: data.variants,
        }),
      data.workspaceId,
    )
  })

type Variant = { funnelId: string; weight: number }

type ExperimentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  campaignId: string
  funnels: { id: string; title: string; published: boolean }[]
} & (
  | { mode: 'create' }
  | {
      mode: 'update'
      experiment: {
        id: string
        name: string
        controlFunnelId: string
        variants: Variant[]
      }
    }
)

function ExperimentDialog(props: ExperimentDialogProps) {
  const { open, onOpenChange, workspaceId, campaignId, funnels, mode } = props
  const experiment = mode === 'update' ? props.experiment : undefined
  const queryClient = useQueryClient()

  const [name, setName] = React.useState(() => experiment?.name ?? '')
  const [controlFunnelId, setControlFunnelId] = React.useState<string | null>(
    () => experiment?.controlFunnelId ?? funnels.find((f) => f.published)?.id ?? null,
  )
  const [variants, setVariants] = React.useState<Variant[]>(() => {
    if (experiment) return experiment.variants
    if (!controlFunnelId) return []
    return [{ funnelId: controlFunnelId, weight: 0 }]
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createExperiment({
        data: {
          workspaceId,
          campaignId,
          controlFunnelId: controlFunnelId!,
          name,
          variants,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', workspaceId, campaignId] })
      onOpenChange(false)
    },
    onError: (error) => {
      if (ExperimentAlreadyActiveError.isInstance(error)) {
        toast.add({
          title: 'Cannot create experiment',
          description: 'Another experiment is already active for this campaign',
          type: 'error',
        })
      } else if (ExperimentInvalidWeightsError.isInstance(error)) {
        toast.add({
          title: 'Cannot create experiment',
          description: 'Variant weights must sum to 100%',
          type: 'error',
        })
      } else if (ExperimentVariantNotPublishedError.isInstance(error)) {
        toast.add({
          title: 'Cannot create experiment',
          description: 'All variant funnels must be published',
          type: 'error',
        })
      } else if (ExperimentVariantInvalidError.isInstance(error)) {
        toast.add({
          title: 'Cannot create experiment',
          description: 'A variant funnel is not associated with this campaign',
          type: 'error',
        })
      } else {
        toast.add({
          title: 'Failed to create experiment',
          description: 'Something went wrong. Please try again.',
          type: 'error',
        })
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      updateExperiment({
        data: {
          workspaceId,
          id: experiment!.id,
          controlFunnelId: controlFunnelId!,
          name,
          variants,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', workspaceId, campaignId] })
      onOpenChange(false)
    },
    onError: (error) => {
      if (ExperimentAlreadyEndedError.isInstance(error)) {
        toast.add({
          title: 'Cannot update experiment',
          description: 'This experiment has already ended',
          type: 'error',
        })
      } else if (ExperimentVariantInvalidError.isInstance(error)) {
        toast.add({
          title: 'Cannot update experiment',
          description: 'A variant funnel is not associated with this campaign',
          type: 'error',
        })
      } else {
        toast.add({
          title: 'Failed to update experiment',
          description: 'Something went wrong. Please try again.',
          type: 'error',
        })
      }
    },
  })

  const upsertMutation = mode === 'create' ? createMutation : updateMutation

  const publishedFunnels = funnels.filter((f) => f.published)
  const selectedFunnels = funnels
    .filter((f) => variants.some((v) => v.funnelId === f.id))
    .sort((a, b) => {
      if (a.id === controlFunnelId) return -1
      if (b.id === controlFunnelId) return 1
      return 0
    })
  const availableFunnels = publishedFunnels.filter((f) => !variants.some((v) => v.funnelId === f.id))
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)
  const canSubmit = name.trim().length > 0 && controlFunnelId && totalWeight === 100

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="sm:max-w-md">
        <Dialog.Header>
          <Dialog.Title>{mode === 'create' ? 'Create experiment' : 'Edit experiment'}</Dialog.Title>
        </Dialog.Header>
        <div className="flex w-full min-w-0 flex-col gap-4">
          <Field.Root>
            <Field.Label>Name</Field.Label>
            <Field.Content>
              <Input value={name} onValueChange={setName} placeholder="Experiment name" />
            </Field.Content>
          </Field.Root>
          <Field.Root>
            <Field.Label>Control</Field.Label>
            <Field.Content>
              <Select.Root
                items={publishedFunnels.map((f) => ({ label: f.title, value: f.id }))}
                value={controlFunnelId}
                onValueChange={(value: string) => {
                  setControlFunnelId(value)
                  setVariants((prev) => {
                    if (prev.some((v) => v.funnelId === value)) return prev
                    return [...prev, { funnelId: value, weight: 0 }]
                  })
                }}
              >
                <Select.Trigger className="w-full">
                  <Select.Value placeholder="Select control funnel" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    {publishedFunnels.map((f) => (
                      <Select.Item key={f.id} value={f.id}>
                        {f.title}
                      </Select.Item>
                    ))}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </Field.Content>
          </Field.Root>
          <Field.Root>
            <Field.Label>Traffic split</Field.Label>
            <Field.Content>
              <div>
                <div className="relative z-10 divide-y divide-border overflow-hidden rounded-lg shadow-sm ring-1 ring-border">
                  {selectedFunnels.map((funnel) => {
                    const isControl = funnel.id === controlFunnelId
                    return (
                      <div
                        key={funnel.id}
                        className="flex max-h-9 min-h-9 min-w-0 items-center justify-between gap-4 overflow-hidden pr-0 pl-1"
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-1">
                          {isControl ? (
                            <span className="size-7 shrink-0" />
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setVariants((prev) => prev.filter((v) => v.funnelId !== funnel.id))}
                            >
                              <XIcon />
                            </Button>
                          )}
                          <p className="truncate text-sm font-medium text-foreground">{funnel.title}</p>
                          {isControl && <Badge variant="secondary">Control</Badge>}
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
                              value={String(variants.find((v) => v.funnelId === funnel.id)?.weight ?? 0)}
                              onValueChange={(raw) =>
                                setVariants((prev) =>
                                  prev.map((v) => (v.funnelId === funnel.id ? { ...v, weight: Number(raw) || 0 } : v)),
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
                    )
                  })}
                  {availableFunnels.length > 0 && (
                    <div>
                      <Select.Root
                        key={variants.length}
                        defaultValue={undefined}
                        onValueChange={(val: string) => {
                          if (val) setVariants((prev) => [...prev, { funnelId: val, weight: 0 }])
                        }}
                      >
                        <SelectPrimitive.Trigger className="flex min-h-9 w-full items-center gap-2 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50">
                          <PlusIcon className="size-4" />
                          Add funnel
                        </SelectPrimitive.Trigger>
                        <Select.Content alignItemWithTrigger={false}>
                          <Select.Group>
                            {availableFunnels.map((funnel) => (
                              <Select.Item key={funnel.id} value={funnel.id}>
                                {funnel.title}
                              </Select.Item>
                            ))}
                          </Select.Group>
                        </Select.Content>
                      </Select.Root>
                    </div>
                  )}
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
            </Field.Content>
          </Field.Root>
        </div>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button onClick={() => upsertMutation.mutate()} disabled={!canSubmit || upsertMutation.isPending}>
            {upsertMutation.isPending && <Spinner />}
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const campaignQuery = useSuspenseQuery(getCampaignQueryOptions(params.workspaceId, params.campaignId))
  const campaign = campaignQuery.data

  const [experimentDialogOpen, setExperimentDialogOpen] = React.useState(false)

  const selectWinnerMutation = useMutation({
    mutationFn: (experimentVariantId: string) =>
      selectWinner({
        data: {
          workspaceId: params.workspaceId,
          experimentId: campaign.activeExperiment!.id,
          experimentVariantId,
        },
      }),
    onSuccess: () => queryClient.invalidateQueries(getCampaignQueryOptions(params.workspaceId, params.campaignId)),
  })

  const stopExperimentMutation = useMutation({
    mutationFn: () =>
      stopExperiment({
        data: {
          workspaceId: params.workspaceId,
          experimentId: campaign.activeExperiment!.id,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(getCampaignQueryOptions(params.workspaceId, params.campaignId))
      snackbar.add({ title: 'Experiment stopped', type: 'success' })
    },
    onError: (error) => {
      if (ExperimentAlreadyEndedError.isInstance(error)) {
        snackbar.add({ title: 'This experiment has already ended', type: 'error' })
      } else if (ExperimentNotStartedError.isInstance(error)) {
        snackbar.add({ title: "This experiment hasn't started yet", type: 'error' })
      } else {
        snackbar.add({ title: 'Failed to stop experiment', type: 'error' })
      }
    },
  })

  const swapDefaultFunnelMutation = useMutation({
    mutationFn: (funnelId: string) =>
      swapDefaultFunnel({
        data: {
          workspaceId: params.workspaceId,
          campaignId: params.campaignId,
          funnelId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(getCampaignQueryOptions(params.workspaceId, params.campaignId))
      toast.add({ title: 'Live funnel updated', type: 'success' })
    },
  })

  const hasActiveExperiment = campaign.activeExperiment !== null

  return (
    <div className="flex h-full w-full max-w-6xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>{campaign.name}</Heading.Title>
        </Heading.Content>
        <Heading.Actions>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(campaign.url)
              snackbar.add({ title: 'Link copied to clipboard', type: 'success' })
            }}
          >
            <LinkIcon />
            Copy link
          </Button>
          {hasActiveExperiment ? (
            <>
              <Button
                variant="outline"
                render={
                  <Link
                    to="/workspace/$workspaceId/campaigns/$campaignId/experiments/$experimentId"
                    params={{
                      workspaceId: params.workspaceId,
                      campaignId: params.campaignId,
                      experimentId: campaign.activeExperiment!.id,
                    }}
                  />
                }
              >
                <ChartBarIcon className="size-4" />
                View analytics
              </Button>
              <Button variant="outline" onClick={() => setExperimentDialogOpen(true)}>
                <PencilIcon className="size-4" />
                Edit experiment
              </Button>
              <Button
                variant="outline"
                onClick={() => stopExperimentMutation.mutate()}
                disabled={stopExperimentMutation.isPending}
              >
                {stopExperimentMutation.isPending ? <Spinner /> : <CancelIcon />}
                Stop experiment
              </Button>
            </>
          ) : (
            campaign.funnels.length > 0 && (
              <Button onClick={() => setExperimentDialogOpen(true)}>
                <PlusIcon />
                Create experiment
              </Button>
            )
          )}
        </Heading.Actions>
      </Heading.Root>

      {campaign.funnels.length === 0 ? (
        <div className="rounded-3xl bg-muted p-2">
          <Card.Root>
            <Card.Content>
              <Empty.Root>
                <Empty.Header>
                  <Empty.Media variant="icon">
                    <TargetArrowIcon />
                  </Empty.Media>
                  <Empty.Title>No funnels added yet</Empty.Title>
                  <Empty.Description>
                    Create a funnel from the funnels page to add it to this campaign.
                  </Empty.Description>
                </Empty.Header>
              </Empty.Root>
            </Card.Content>
          </Card.Root>
        </div>
      ) : (
        <DataGrid.Root className="grid-cols-3">
          <DataGrid.Header>
            <DataGrid.Head>Funnel</DataGrid.Head>
            <DataGrid.Head>Traffic</DataGrid.Head>
            <DataGrid.Head srOnly>Actions</DataGrid.Head>
          </DataGrid.Header>
          <DataGrid.Body>
            {campaign.funnels.map((funnel) => (
              <DataGrid.Row key={funnel.id}>
                <DataGrid.Cell className="gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{funnel.title}</span>
                  {hasActiveExperiment && funnel.isControlVariant && <Badge variant="secondary">Control</Badge>}
                </DataGrid.Cell>
                <DataGrid.Cell>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-foreground">{funnel.weight}%</span>
                    {funnel.weight > 0 && (
                      <Badge className="border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Live
                      </Badge>
                    )}
                  </div>
                </DataGrid.Cell>
                <DataGrid.Cell className="justify-end">
                  {hasActiveExperiment && funnel.experimentVariantId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectWinnerMutation.mutate(funnel.experimentVariantId!)}
                      disabled={selectWinnerMutation.isPending}
                    >
                      {selectWinnerMutation.isPending && <LoaderIcon className="animate-spin" />}
                      <TrophyIcon className="size-3.5" />
                      Pick as winner
                    </Button>
                  )}
                  {!hasActiveExperiment && funnel.weight === 0 && (
                    <Menu.Root>
                      <Menu.Trigger render={<Button size="icon-sm" variant="ghost" />}>
                        <DotsIcon className="text-muted-foreground" />
                      </Menu.Trigger>
                      <Menu.Content align="end">
                        <Menu.Item
                          onClick={() => swapDefaultFunnelMutation.mutate(funnel.id)}
                          disabled={swapDefaultFunnelMutation.isPending}
                        >
                          <ArrowBigUpLinesIcon />
                          Make live
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Root>
                  )}
                </DataGrid.Cell>
              </DataGrid.Row>
            ))}
          </DataGrid.Body>
        </DataGrid.Root>
      )}

      <ExperimentDialog
        open={experimentDialogOpen}
        onOpenChange={setExperimentDialogOpen}
        workspaceId={params.workspaceId}
        campaignId={campaign.id}
        funnels={campaign.funnels}
        {...(hasActiveExperiment
          ? {
              mode: 'update' as const,
              experiment: {
                id: campaign.activeExperiment!.id,
                name: campaign.activeExperiment!.name,
                controlFunnelId: campaign.funnels.find((f) => f.isControlVariant)?.id ?? campaign.funnels[0]?.id ?? '',
                variants: campaign.funnels
                  .filter((f) => f.experimentVariantId !== null)
                  .map((f) => ({ funnelId: f.id, weight: f.weight })),
              },
            }
          : { mode: 'create' as const })}
      />
    </div>
  )
}
