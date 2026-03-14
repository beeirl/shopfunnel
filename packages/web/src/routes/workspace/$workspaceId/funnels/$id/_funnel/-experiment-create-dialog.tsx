import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { withActor } from '@/context/auth.withActor'
import { listVariantsQueryOptions } from '@/routes/workspace/$workspaceId/funnels/$id/-common'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconPencil as PencilIcon } from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { useFunnel } from './-context'

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

export const listExperiments = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.listExperiments(data.funnelId), data.workspaceId)
  })

export const listExperimentsQueryOptions = (input: { workspaceId: string; funnelId: string }) =>
  queryOptions({
    queryKey: ['experiments', input.workspaceId, input.funnelId],
    queryFn: () => listExperiments({ data: input }),
  })

type DialogHandle = ReturnType<typeof Dialog.createHandle>

function ExperimentCreateDialog({ handle }: { handle: DialogHandle }) {
  const { data: funnel } = useFunnel()
  const queryClient = useQueryClient()

  const variantsQuery = useSuspenseQuery(
    listVariantsQueryOptions({ workspaceId: funnel.workspaceId, funnelId: funnel.id }),
  )
  const variants = variantsQuery.data

  const [name, setName] = React.useState('')
  const [nameError, setNameError] = React.useState<string | null>(null)
  const [weights, setWeights] = React.useState<{ funnelVariantId: string; weight: number }[]>(
    variants.map((v) => ({ funnelVariantId: v.id, weight: 0 })),
  )

  const mutation = useMutation({
    mutationFn: () =>
      createExperimentFn({
        data: {
          workspaceId: funnel.workspaceId,
          funnelId: funnel.id,
          name,
          variants: weights,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(
        listExperimentsQueryOptions({ workspaceId: funnel.workspaceId, funnelId: funnel.id }),
      )
      handle.close()
    },
  })

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)
  const isValid = name.trim().length > 0 && weights.length >= 1 && totalWeight === 100

  const handleOpenChange = (open: boolean) => {
    if (open) {
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
    <Dialog.Root handle={handle} onOpenChange={handleOpenChange}>
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

ExperimentCreateDialog.createHandle = Dialog.createHandle

export { ExperimentCreateDialog }
