import { withActor } from '@/context/auth.withActor'
import { Funnel as FunnelComponent } from '@/funnel'
import { Theme } from '@/funnel/theme'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const getFunnel = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      const funnel = await Funnel.fromId(data.funnelId)
      if (!funnel) throw notFound()
      return funnel
    }, data.workspaceId)
  })

const getFunnelQueryOptions = (workspaceId: string, funnelId: string) =>
  queryOptions({
    queryKey: ['funnel', workspaceId, funnelId],
    queryFn: () => getFunnel({ data: { workspaceId, funnelId } }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/preview/')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getFunnelQueryOptions(params.workspaceId, params.id))
  },
})

function RouteComponent() {
  const params = Route.useParams()

  const funnelQuery = useSuspenseQuery(getFunnelQueryOptions(params.workspaceId, params.id))
  const funnel = funnelQuery.data

  return (
    <Theme theme={funnel.theme}>
      <div className="min-h-screen w-full p-6">
        <div className="mx-auto max-w-md">
          <FunnelComponent funnel={funnel} mode="preview" />
        </div>
      </div>
    </Theme>
  )
}
