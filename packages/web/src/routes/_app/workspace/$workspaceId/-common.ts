import { withActor } from '@/context/auth.withActor'
import { Actor } from '@shopfunnel/core/actor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Integration } from '@shopfunnel/core/integration/index'
import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'

/**
 * Get UTC datetime range for a local date range.
 * Converts local midnight-to-end-of-day to UTC ISO strings.
 */
export function getDateRange(
  startDate: Date,
  endDate: Date,
): {
  startDate: string
  endDate: string
} {
  // Start of day in local timezone
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  // End of day in local timezone
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

/**
 * Format a UTC datetime string to local time for display.
 */
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
