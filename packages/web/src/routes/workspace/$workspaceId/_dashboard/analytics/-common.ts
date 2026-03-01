import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { endOfDay, startOfDay, startOfMonth, startOfYear, subDays } from 'date-fns'
import { z } from 'zod'

export const DATE_RANGE_PERIODS = ['today', 'yesterday', '7d', '30d', 'month', 'year'] as const
type DateRangePeriod = (typeof DATE_RANGE_PERIODS)[number]

export const AnalyticsSearch = z.object({
  period: z.enum(DATE_RANGE_PERIODS).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  tab: z.enum(['dropoff']).optional(),
})
export type AnalyticsSearch = z.infer<typeof AnalyticsSearch>

export function formatDateForSearch(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${d}-${h}${min}`
}

function parseDateFromSearch(str: string): Date {
  const parts = str.split('-')
  const datePart = parts[0]!
  const timePart = parts[1]!
  const dateParts = datePart.split('.').map(Number)
  const y = dateParts[0]!
  const mo = dateParts[1]!
  const d = dateParts[2]!
  const h = Number(timePart.slice(0, 2))
  const min = Number(timePart.slice(2, 4))
  return new Date(y, mo - 1, d, h, min)
}

function resolvePresetRange(period: DateRangePeriod): { from: Date; to: Date } {
  const now = new Date()
  now.setSeconds(0, 0)

  switch (period) {
    case 'today':
      return { from: startOfDay(now), to: now }
    case 'yesterday': {
      const yesterday = subDays(now, 1)
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
    }
    case '7d':
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now }
    case '30d':
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now }
    case 'month':
      return { from: startOfMonth(now), to: now }
    case 'year':
      return { from: startOfYear(now), to: now }
  }
}

export function resolveAnalyticsSearch(search: AnalyticsSearch): { period: string | null; from: Date; to: Date } {
  if (search.from && search.to) {
    return {
      period: null,
      from: parseDateFromSearch(search.from),
      to: parseDateFromSearch(search.to),
    }
  }

  const period = search.period ?? 'today'
  return { period, ...resolvePresetRange(period) }
}

export function formatNumber(value: number, compact = false): string {
  if (compact && value >= 1000) {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  }
  return value.toLocaleString('en-US')
}

export function formatPercentage(value: number): string {
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return `${formatted}%`
}

const listFunnels = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Funnel.list(), workspaceId)
  })

export const listFunnelsQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['funnels', workspaceId],
    queryFn: () => listFunnels({ data: workspaceId }),
  })
