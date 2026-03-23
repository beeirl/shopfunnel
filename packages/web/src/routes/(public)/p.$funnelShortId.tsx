import { Funnel } from '@/components/funnel'
import { listIntegrations } from '@/routes/(public)/-common'
import { head } from '@/routes/(public)/-head'
import { Funnel as FunnelCore } from '@shopfunnel/core/funnel/index'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { z } from 'zod'

const getFunnel = createServerFn()
  .inputValidator(z.object({ shortId: z.string().length(8) }))
  .handler(async ({ data }) => {
    const funnel = await FunnelCore.getPublishedVersion(data.shortId)
    if (!funnel) throw notFound()

    const host = getRequestHeader('host')
    if (host && host !== new URL(funnel.url).host) {
      throw notFound()
    }

    return funnel
  })

export const Route = createFileRoute('/(public)/p/$funnelShortId')({
  component: RouteComponent,
  ssr: true,
  loader: async ({ params }) => {
    const funnel = await getFunnel({ data: { shortId: params.funnelShortId } })
    if (!funnel) throw notFound()

    const integrations = await listIntegrations({ data: { workspaceId: funnel.workspaceId } })

    return { funnel, integrations }
  },
  head: ({ loaderData }) =>
    head({
      domainSettings: loaderData?.funnel.settings,
      integrations: loaderData?.integrations,
    }),
})

function RouteComponent() {
  const { funnel } = Route.useLoaderData()

  return (
    <div className="flex min-h-dvh flex-col">
      <Funnel
        funnel={funnel}
        mode="preview"
        onComplete={(_, redirectUrl) => {
          if (!redirectUrl) return
          window.location.href = redirectUrl
        }}
      />
    </div>
  )
}
