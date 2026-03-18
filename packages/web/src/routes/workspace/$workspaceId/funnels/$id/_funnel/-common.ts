import { createCollection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import type { QueryClient } from '@tanstack/react-query'
import { getFunnelVariantDraft, getFunnelVariantDraftQueryOptions, updateFunnel } from '../-common'

export function createFunnelVariantCollection(
  workspaceId: string,
  funnelId: string,
  variantId: string,
  queryClient: QueryClient,
) {
  const { queryKey } = getFunnelVariantDraftQueryOptions({
    workspaceId,
    funnelId,
    funnelVariantId: variantId,
  })

  return createCollection(
    queryCollectionOptions({
      id: `funnel-${funnelId}-${variantId}`,
      queryKey,
      queryFn: async () => {
        const funnel = await getFunnelVariantDraft({
          data: { workspaceId, funnelId, funnelVariantId: variantId },
        })
        return [funnel]
      },
      queryClient,
      getKey: (item) => item.variantId,
      onUpdate: async ({ transaction }) => {
        const { changes, original } = transaction.mutations[0]!
        const funnelVariantId = (original as { variantId?: string })?.variantId
        if (!funnelVariantId) return { refetch: false }
        await updateFunnel({
          data: {
            workspaceId,
            funnelId,
            funnelVariantId,
            ...(changes.pages && { pages: changes.pages }),
            ...(changes.rules && { rules: changes.rules }),
            ...(changes.theme && { theme: changes.theme }),
            ...(changes.title && { title: changes.title }),
            ...(changes.settings && { settings: changes.settings }),
          },
        })
        return { refetch: false }
      },
    }),
  )
}

export type FunnelVariantCollection = ReturnType<typeof createFunnelVariantCollection>
