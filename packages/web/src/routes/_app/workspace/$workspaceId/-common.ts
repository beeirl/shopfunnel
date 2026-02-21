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
        isSuperAdmin: [
          'acc_01KET2AQA9PW8VFYFV6D2W1B29', // Chris
          'acc_01KET6T3GY4MEEQ8WTRWSP6741', // Kai
        ].includes(Actor.accountId()),
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
      return billing
    }, workspaceId)
  })

export const getBillingQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['billing', workspaceId],
    queryFn: () => getBilling({ data: workspaceId }),
  })

export const getUsage = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      periodStartedAt: z.string().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const now = new Date()
    const periodStart = data.periodStartedAt
      ? new Date(data.periodStartedAt)
      : new Date(now.getFullYear(), now.getMonth(), 1)

    // Find the current monthly window within the billing period.
    // For yearly subscriptions, periodStartedAt is the start of the year,
    // so we advance month-by-month to find the current monthly sub-period.
    let windowStart = new Date(periodStart)
    while (true) {
      const nextMonth = new Date(windowStart)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      // Cap to last day of target month if day-of-month overflowed (e.g. Jan 31 -> Mar 3)
      if (nextMonth.getDate() !== windowStart.getDate()) {
        nextMonth.setDate(0)
      }
      if (nextMonth > now) break
      windowStart = nextMonth
    }

    const params = new URLSearchParams({
      workspace_id: data.workspaceId,
      start_date: windowStart.toISOString(),
      end_date: now.toISOString(),
    })

    const response = await fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/usages.json?${params}`, {
      headers: { Authorization: `Bearer ${Resource.TINYBIRD_TOKEN.value}` },
    })
    const json = (await response.json()) as any
    const visitors = json.data?.[0]?.visitors ?? 0

    return { visitors }
  })

export const getUsageQueryOptions = (workspaceId: string, periodStartedAt: string | null) =>
  queryOptions({
    queryKey: ['usage', workspaceId, periodStartedAt],
    queryFn: () => getUsage({ data: { workspaceId, periodStartedAt } }),
  })
