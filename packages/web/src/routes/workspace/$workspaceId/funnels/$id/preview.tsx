import { Funnel } from '@/components/funnel'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getFunnelVariantDraftQueryOptions } from './-common'

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/preview')({
  component: RouteComponent,
  validateSearch: z.object({
    variant: z.string().optional(),
  }),
  loaderDeps: ({ search }) => ({ variant: search.variant }),
  loader: async ({ context, params, deps }) => {
    const funnel = await context.queryClient.ensureQueryData(
      getFunnelVariantDraftQueryOptions({
        workspaceId: params.workspaceId,
        funnelId: params.id,
        funnelVariantId: deps.variant,
      }),
    )
    return { funnel }
  },
  head: ({ loaderData }) => {
    return { meta: [{ title: loaderData?.funnel.title }] }
  },
})

function RouteComponent() {
  const params = Route.useParams()
  const search = Route.useSearch()

  const funnelQuery = useSuspenseQuery(
    getFunnelVariantDraftQueryOptions({
      workspaceId: params.workspaceId,
      funnelId: params.id,
      funnelVariantId: search.variant,
    }),
  )
  const funnel = funnelQuery.data

  return (
    <Funnel
      funnel={funnel}
      mode="preview"
      onComplete={(_, redirectUrl) => {
        if (!redirectUrl) return
        window.location.href = redirectUrl
      }}
    />
  )
}
