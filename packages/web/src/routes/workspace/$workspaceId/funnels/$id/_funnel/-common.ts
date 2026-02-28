import { createCollection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import type { QueryClient } from '@tanstack/react-query'
import { getFunnel, updateFunnel } from '../-common'

export function createFunnelCollection(workspaceId: string, funnelId: string, queryClient: QueryClient) {
  return createCollection(
    queryCollectionOptions({
      id: funnelId,
      queryKey: ['funnel', workspaceId, funnelId],
      queryFn: async () => {
        const funnel = await getFunnel({ data: { workspaceId, funnelId } })
        return [funnel]
      },
      queryClient,
      getKey: () => 'funnel',
      onUpdate: async ({ transaction }) => {
        const { changes } = transaction.mutations[0]!
        await updateFunnel({
          data: {
            workspaceId,
            funnelId,
            ...(changes.pages && { pages: changes.pages }),
            ...(changes.rules && { rules: changes.rules }),
            ...(changes.theme && { theme: changes.theme }),
            ...(changes.title && { title: changes.title }),
            ...(changes.settings && { settings: changes.settings }),
          },
        })
      },
    }),
  )
}

export type FunnelCollection = ReturnType<typeof createFunnelCollection>
