import { withActor } from '@/context/auth.withActor'
import { Actor } from '@shopfunnel/core/actor'
import { Billing } from '@shopfunnel/core/billing/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Integration } from '@shopfunnel/core/integration/index'
import { User } from '@shopfunnel/core/user/index'
import { Workspace } from '@shopfunnel/core/workspace/index'
import { Resource } from '@shopfunnel/resource'
import { queryOptions } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { DateTime } from 'luxon'
import { z } from 'zod'

export const PLANS = [
  {
    id: 'standard5K',
    name: 'Starter',
    visitors: 5_000,
    monthlyPrice: 74,
    yearlyPrice: 740,
    overageRate: 0.03,
    features: [
      '5k unique visitors/month',
      'Unlimited funnels',
      'Advanced analytics',
      'Custom domains',
      'Meta Pixel integration',
      '$0.03 per extra visitor',
    ],
  },
  {
    id: 'standard25K',
    name: 'Growth',
    visitors: 25_000,
    monthlyPrice: 249,
    yearlyPrice: 2490,
    overageRate: 0.02,
    defaultPopular: true,
    features: [
      '25k unique visitors/month',
      'Unlimited funnels',
      'Advanced analytics',
      'Custom domains',
      'Meta Pixel integration',
      '$0.02 per extra visitor',
    ],
  },
  {
    id: 'standard50K',
    name: 'Business',
    visitors: 50_000,
    monthlyPrice: 399,
    yearlyPrice: 3990,
    overageRate: 0.02,
    features: [
      '50k unique visitors/month',
      'Unlimited funnels',
      'Advanced analytics',
      'Custom domains',
      'Meta Pixel integration',
      'Custom Slack Connect',
      '$0.02 per extra visitor',
    ],
  },
  {
    id: 'standard100K',
    name: 'Pro',
    visitors: 100_000,
    monthlyPrice: 699,
    yearlyPrice: 6990,
    overageRate: 0.02,
    features: [
      '100k unique visitors/month',
      'Unlimited funnels',
      'Advanced analytics',
      'Custom domains',
      'Meta Pixel integration',
      'Custom Slack Connect',
      '$0.02 per extra visitor',
    ],
  },
  {
    id: 'standard250K',
    name: 'Scale',
    visitors: 250_000,
    monthlyPrice: 1699,
    yearlyPrice: 16990,
    overageRate: 0.02,
    features: [
      '250k unique visitors/month',
      'Unlimited funnels',
      'Advanced analytics',
      'Custom domains',
      'Meta Pixel integration',
      'Custom Slack Connect',
      '$0.02 per extra visitor',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    visitors: null,
    monthlyPrice: null,
    yearlyPrice: null,
    overageRate: null,
    features: ['Fully customizable', 'Volume discounts', 'Flexible terms'],
  },
] as const

export const ADDONS = [
  {
    id: 'managed',
    name: 'Managed Service',
    description: 'We create up to 4 new funnels per month including continuous A/B testing and optimization.',
    monthlyPrice: 1500,
    yearlyPrice: 18000,
  },
] as const

export function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDateRelative(date: Date) {
  return DateTime.fromJSDate(date).setLocale('en-US').toRelative()
}

export const getSession = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => {
      return {
        accountId: Actor.accountId(),
        isAdmin: Actor.userRole() === 'admin',
        isSuperAdmin: !!(
          process.env.DEV ||
          [
            'acc_01KET2AQA9PW8VFYFV6D2W1B29', // Chris
            'acc_01KET6T3GY4MEEQ8WTRWSP6741', // Kai
          ].includes(Actor.accountId())
        ),
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

export const getWorkspaceFlags = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Workspace.listFlags(), workspaceId)
  })

export const listIntegrations = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(async ({ data: workspaceId }) => {
    return withActor(() => Integration.list(), workspaceId)
  })

export const listIntegrationsQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['integrations', workspaceId],
    queryFn: () => listIntegrations({ data: workspaceId }),
  })

export const checkOnboarding = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(async ({ data: workspaceId }) => {
    await withActor(async () => {
      const flags = await Workspace.listFlags()
      if (!flags.onboardingCompleted) {
        throw redirect({
          to: '/workspace/$workspaceId/onboarding',
          params: { workspaceId },
        })
      }
    }, workspaceId)
  })

export const checkOnboardingQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['workspace-onboarding-gate', workspaceId],
    queryFn: async () => {
      await checkOnboarding({ data: workspaceId })
      return true
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })

export const checkBilling = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(async ({ data: workspaceId }) => {
    await withActor(async () => {
      const billing = await Billing.get()
      if (!billing?.active) {
        throw redirect({
          to: '/workspace/$workspaceId/subscribe',
          params: { workspaceId },
        })
      }
    }, workspaceId)
  })

export const checkBillingQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['workspace-billing-gate', workspaceId],
    queryFn: async () => {
      await checkBilling({ data: workspaceId })
      return true
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })

export const getBilling = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(async () => {
      const billing = await Billing.get()
      if (!billing) throw new Error('Billing not found')
      const usage =
        billing.usagePeriodStartedAt && billing.usagePeriodEndsAt
          ? await Billing.getUsage({ start: billing.usagePeriodStartedAt, end: billing.usagePeriodEndsAt })
          : { visitors: 0 }
      return { ...billing, usage }
    }, workspaceId)
  })

export const getBillingQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['billing', workspaceId],
    queryFn: () => getBilling({ data: workspaceId }),
  })

export function formatNumber(value: number, compact = false): string {
  if (compact && value >= 1000) {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  }
  return value.toLocaleString('en-US')
}

export function formatPercentage(value: number): string {
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
  return `${formatted}%`
}

type AnalyticsKpiTotals = {
  total_visitors: number
  total_starts: number
  total_completions: number
  total_orders: number
  total_revenue: number
}

type AnalyticsKpiDerived = {
  start_rate: number
  completion_rate: number
  conversion_rate: number
  revenue_per_visitor: number
  avg_order_value: number
}

export type AnalyticsKpiRow = AnalyticsKpiTotals & AnalyticsKpiDerived & Record<string, unknown>
export type AnalyticsTimeseriesRow = {
  date: string
  visitors: number
} & Record<string, unknown>

function serializeAnalyticsKpis<T extends AnalyticsKpiTotals & Record<string, unknown>>(
  row: T,
): T & AnalyticsKpiDerived {
  const v = row.total_visitors
  const o = row.total_orders
  return {
    ...row,
    start_rate: v > 0 ? Math.round((row.total_starts / v) * 1000) / 10 : 0,
    completion_rate: v > 0 ? Math.round((row.total_completions / v) * 1000) / 10 : 0,
    conversion_rate: v > 0 ? Math.round((row.total_orders / v) * 1000) / 10 : 0,
    revenue_per_visitor: v > 0 ? Math.round((row.total_revenue / v) * 100) / 100 : 0,
    avg_order_value: o > 0 ? Math.round((row.total_revenue / o) * 100) / 100 : 0,
  }
}

const getAnalyticsKpis = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      funnelId: z.string().optional(),
      funnelVariantId: z.string().optional(),
      funnelExperimentId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const token = Resource.TINYBIRD_TOKEN.value
    const params = new URLSearchParams({
      workspace_id: data.workspaceId,
      start_date: data.startDate,
      end_date: data.endDate,
    })
    if (data.funnelId) params.set('funnel_id', data.funnelId)
    if (data.funnelVariantId) params.set('funnel_variant_id', data.funnelVariantId)
    if (data.funnelExperimentId) params.set('funnel_experiment_id', data.funnelExperimentId)

    const response = await fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/analytics_kpis.json?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json: any = await response.json()
    const raw = json?.data?.[0] ?? null
    return raw ? serializeAnalyticsKpis(raw) : null
  })

export const getAnalyticsKpisQueryOptions = (input: {
  workspaceId: string
  funnelId?: string
  funnelVariantId?: string
  funnelExperimentId?: string
  startDate: string
  endDate: string
}) =>
  queryOptions<AnalyticsKpiRow | null>({
    queryKey: [
      'analytics-kpis',
      input.workspaceId,
      input.funnelId,
      input.funnelVariantId,
      input.funnelExperimentId,
      input.startDate,
      input.endDate,
    ],
    queryFn: () => getAnalyticsKpis({ data: input }),
  })

const getAnalyticsFunnelKpis = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      funnelId: z.string().optional(),
      funnelVariantId: z.string().optional(),
      funnelExperimentId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const token = Resource.TINYBIRD_TOKEN.value
    const params = new URLSearchParams({
      workspace_id: data.workspaceId,
      start_date: data.startDate,
      end_date: data.endDate,
    })
    if (data.funnelId) params.set('funnel_id', data.funnelId)
    if (data.funnelVariantId) params.set('funnel_variant_id', data.funnelVariantId)
    if (data.funnelExperimentId) params.set('funnel_experiment_id', data.funnelExperimentId)

    const response = await fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/analytics_funnel_kpis.json?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json: any = await response.json()
    const rows = Array.isArray(json?.data) ? json.data : []
    return rows.map(serializeAnalyticsKpis)
  })

export const getAnalyticsFunnelKpisQueryOptions = (input: {
  workspaceId: string
  funnelId?: string
  funnelVariantId?: string
  funnelExperimentId?: string
  startDate: string
  endDate: string
}) =>
  queryOptions<AnalyticsKpiRow[]>({
    queryKey: [
      'analytics-funnel-kpis',
      input.workspaceId,
      input.funnelId,
      input.funnelVariantId,
      input.funnelExperimentId,
      input.startDate,
      input.endDate,
    ],
    queryFn: () => getAnalyticsFunnelKpis({ data: input }),
  })

const getAnalyticsTimeseries = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      funnelId: z.string().optional(),
      funnelVariantId: z.string().optional(),
      funnelExperimentId: z.string().optional(),
      granularity: z.enum(['hour', 'day']),
    }),
  )
  .handler(async ({ data }) => {
    const token = Resource.TINYBIRD_TOKEN.value
    const params = new URLSearchParams({
      workspace_id: data.workspaceId,
      start_date: data.startDate,
      end_date: data.endDate,
      granularity: data.granularity,
    })
    if (data.funnelId) params.set('funnel_id', data.funnelId)
    if (data.funnelVariantId) params.set('funnel_variant_id', data.funnelVariantId)
    if (data.funnelExperimentId) params.set('funnel_experiment_id', data.funnelExperimentId)

    const response = await fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/analytics_timeseries.json?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json: any = await response.json()
    return Array.isArray(json?.data) ? json.data : []
  })

export const getAnalyticsTimeseriesQueryOptions = (input: {
  workspaceId: string
  funnelId?: string
  funnelVariantId?: string
  funnelExperimentId?: string
  startDate: string
  endDate: string
  granularity: 'hour' | 'day'
}) =>
  queryOptions<AnalyticsTimeseriesRow[]>({
    queryKey: [
      'analytics-timeseries',
      input.workspaceId,
      input.funnelId,
      input.funnelVariantId,
      input.funnelExperimentId,
      input.startDate,
      input.endDate,
      input.granularity,
    ],
    queryFn: () => getAnalyticsTimeseries({ data: input }),
  })
