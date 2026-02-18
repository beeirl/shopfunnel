import { Funnel } from '@/components/funnel'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getFunnelQueryOptions } from './-common'

export const Route = createFileRoute('/_app/workspace/$workspaceId/funnels/$id/preview')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const funnel = await context.queryClient.ensureQueryData(getFunnelQueryOptions(params.workspaceId, params.id))
    return { funnel }
  },
  head: ({ loaderData }) => {
    return { meta: [{ title: loaderData?.funnel.title }] }
  },
})

function RouteComponent() {
  const params = Route.useParams()

  const funnelQuery = useSuspenseQuery(getFunnelQueryOptions(params.workspaceId, params.id))
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
