import { listIntegrations } from '@/routes/(funnel)/-common'
import { head } from '@/routes/(funnel)/-head'
import { Domain } from '@shopfunnel/core/domain/index'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

const getDomain = createServerFn().handler(async () => {
  const host = getRequestHeader('host')
  if (!host) return
  return Domain.fromHostname(host)
})

export const Route = createFileRoute('/(funnel)/r/$')({
  component: Outlet,
  ssr: true,
  loader: async () => {
    const domain = await getDomain()
    const integrations = domain ? await listIntegrations({ data: { workspaceId: domain.workspaceId } }) : undefined
    return { domain, integrations }
  },
  head: ({ loaderData }) =>
    head({
      domainSettings: loaderData?.domain?.settings ?? undefined,
      integrations: loaderData?.integrations,
    }),
})
