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
import { formatDistanceToNow } from 'date-fns'
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

const setMainVariantFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant'),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () => Funnel.setMainVariant({ funnelId: data.funnelId, funnelVariantId: data.funnelVariantId }),
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

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const variantsQuery = useSuspenseQuery(
    listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
  )
  const variants = variantsQuery.data

  const setMainMutation = useMutation({
    mutationFn: (funnelVariantId: string) =>
      setMainVariantFn({
        data: {
          workspaceId: params.workspaceId,
          funnelId: params.id,
          funnelVariantId,
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
        </Heading.Root>

        <DataGrid.Root className="grid-cols-[1fr_auto_auto]">
          <DataGrid.Header>
            <DataGrid.Head>Title</DataGrid.Head>
            <DataGrid.Head hideOnMobile>Updated</DataGrid.Head>
            <DataGrid.Head srOnly>Actions</DataGrid.Head>
          </DataGrid.Header>
          <DataGrid.Body>
            {variants.map((variant) => (
              <DataGrid.Row key={variant.id}>
                <DataGrid.Cell>
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{variant.title}</span>
                    {variant.isMain && (
                      <Badge variant="outline" className="shrink-0">
                        Main
                      </Badge>
                    )}
                  </span>
                </DataGrid.Cell>
                <DataGrid.Cell hideOnMobile>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(variant.updatedAt, { addSuffix: true })}
                  </span>
                </DataGrid.Cell>
                <DataGrid.Cell>
                  {!variant.isMain && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={setMainMutation.isPending}
                      onClick={() => setMainMutation.mutate(variant.id)}
                    >
                      {setMainMutation.isPending && setMainMutation.variables === variant.id && <Spinner />}
                      Set as main
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
