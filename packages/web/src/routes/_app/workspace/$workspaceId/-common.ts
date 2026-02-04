import { withActor } from '@/context/auth.withActor'
import { Actor } from '@shopfunnel/core/actor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Integration } from '@shopfunnel/core/integration/index'
import { User } from '@shopfunnel/core/user/index'
import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'

export function getDateRange(
  startDate: Date,
  endDate: Date,
): {
  startDate: string
  endDate: string
} {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

export function formatDateForChart(utcDateStr: string, granularity: 'hour' | 'day'): string {
  const date = new Date(utcDateStr)
  if (granularity === 'hour') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const getSession = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => {
      return {
        accountId: Actor.accountId(),
        isAdmin: Actor.userRole() === 'admin',
      }
    }, workspaceId)
  })

export const getSessionQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['session', workspaceId],
    queryFn: () => getSession({ data: workspaceId }),
  })

export const getUserEmail = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(async () => {
      const actor = Actor.assert('user')
      const user = await User.getAuthEmail(actor.properties.userId)
      return user!
    }, workspaceId)
  })

export const getUserEmailQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['user-email', workspaceId],
    queryFn: () => getUserEmail({ data: workspaceId }),
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
