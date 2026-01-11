import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getFunnel = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      const funnel = await Funnel.getCurrentVersion(data.funnelId)
      if (!funnel) throw notFound()
      return funnel
    }, data.workspaceId)
  })

export const getFunnelQueryOptions = (workspaceId: string, funnelId: string) =>
  queryOptions({
    queryKey: ['funnel', workspaceId, funnelId],
    queryFn: () => getFunnel({ data: { workspaceId, funnelId } }),
  })
