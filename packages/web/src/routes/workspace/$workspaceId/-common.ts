import { withActor } from '@/context/auth.withActor'
import { Actor } from '@shopfunnel/core/actor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Integration } from '@shopfunnel/core/integration/index'
import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'

export const getSession = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => {
      return {
        isAdmin: Actor.userRole() === 'admin',
      }
    }, workspaceId)
  })

export const getSessionQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['session', workspaceId],
    queryFn: () => getSession({ data: workspaceId }),
  })

export const getShopifyIntegration = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(async ({ data: workspaceId }) => {
    const integration = await withActor(() => Integration.fromProvider('shopify'), workspaceId)
    return integration ?? null
  })

export const getShopifyIntegrationQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['shopify-integration', workspaceId],
    queryFn: () => getShopifyIntegration({ data: workspaceId }),
  })
