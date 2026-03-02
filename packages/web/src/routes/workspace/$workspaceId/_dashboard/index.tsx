import { DateRangePicker, type DateRangePickerValue } from '@/components/date-range-picker'
import { Card } from '@/components/ui/card'
import { Chart, type ChartConfig } from '@/components/ui/chart'
import { Empty } from '@/components/ui/empty'
import { Table } from '@/components/ui/table'
import { withActor } from '@/context/auth.withActor'
import {
  formatNumber,
  formatPercentage,
  getAnalyticsFunnelKpisQueryOptions,
  getAnalyticsTimeseriesQueryOptions,
} from '@/routes/workspace/$workspaceId/-common'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Resource } from '@shopfunnel/resource'
import { IconChartBar as ChartBarIcon } from '@tabler/icons-react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { z } from 'zod'
import { Heading } from './-components/heading'

const DATE_RANGE_PERIODS = ['today', 'yesterday', '24h', '7d', '30d', 'month', 'year'] as const

function formatDateForSearch(date: Date): string {
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

function resolvePresetRange(period: (typeof DATE_RANGE_PERIODS)[number]): { from: Date; to: Date } {
  const now = new Date()
  now.setSeconds(0, 0)

  switch (period) {
    case 'today':
      return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to: now }
    case 'yesterday': {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        from: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
        to: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999),
      }
    }
    case '24h':
      return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000), to: now }
    case '7d':
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now }
    case '30d':
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now }
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1), to: now }
  }
}

function resolveSearch(search: { period?: string; from?: string; to?: string }): {
  period: string | null
  from: Date
  to: Date
} {
  if (search.from && search.to) {
    return {
      period: null,
      from: parseDateFromSearch(search.from),
      to: parseDateFromSearch(search.to),
    }
  }
  const period = (search.period as (typeof DATE_RANGE_PERIODS)[number]) ?? 'today'
  return { period, ...resolvePresetRange(period) }
}

function computeGranularity(from: Date, to: Date): 'hour' | 'day' {
  const durationMs = to.getTime() - from.getTime()
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000
  return durationMs <= twoDaysMs ? 'hour' : 'day'
}

function formatCurrency(cents: number, compact?: boolean): string {
  const dollars = cents / 100
  if (compact && Math.abs(dollars) >= 1000) {
    return dollars.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    })
  }
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDateForChart(utcDateStr: string, granularity: 'hour' | 'day'): string {
  const date = new Date(utcDateStr)
  if (granularity === 'hour') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type AnalyticsKpis = {
  total_visitors: number
  total_starts: number
  total_completions: number
  total_orders: number
  total_revenue: number
  start_rate: number
  completion_rate: number
  conversion_rate: number
  revenue_per_visitor: number
  avg_order_value: number
}

const getAnalyticsKpis = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: z.string(),
      filter: z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const token = Resource.TINYBIRD_TOKEN.value
    const params = new URLSearchParams({
      workspace_id: data.workspaceId,
      start_date: data.filter.startDate,
      end_date: data.filter.endDate,
    })

    const response = await fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/analytics_kpis.json?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = (await response.json()) as { data: AnalyticsKpis[] }
    return json.data?.[0] ?? null
  })

const getAnalyticsKpisQueryOptions = (workspaceId: string, filter: { startDate: string; endDate: string }) =>
  queryOptions({
    queryKey: ['analytics-kpis', workspaceId, 'all', filter.startDate, filter.endDate],
    queryFn: () => getAnalyticsKpis({ data: { workspaceId, filter } }),
  })

const listFunnels = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Funnel.list(), workspaceId)
  })

const listFunnelsQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['funnels', workspaceId],
    queryFn: () => listFunnels({ data: workspaceId }),
  })

const chartConfig = {
  visitors: { label: 'Visitors', color: 'var(--color-chart-1)' },
} satisfies ChartConfig

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard/')({
  staticData: { title: 'Dashboard' },
  component: RouteComponent,
  validateSearch: z.object({
    period: z.enum(DATE_RANGE_PERIODS).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
  loaderDeps: ({ search }) => {
    const resolved = resolveSearch(search)
    return {
      period: resolved.period,
      startDate: resolved.from.toISOString(),
      endDate: resolved.to.toISOString(),
    }
  },
  loader: async ({ context, params, deps }) => {
    const filter = { startDate: deps.startDate, endDate: deps.endDate }
    const granularity = computeGranularity(new Date(deps.startDate), new Date(deps.endDate))

    await Promise.all([
      context.queryClient.ensureQueryData(getAnalyticsKpisQueryOptions(params.workspaceId, filter)),
      context.queryClient.ensureQueryData(
        getAnalyticsTimeseriesQueryOptions(params.workspaceId, undefined, filter, granularity),
      ),
      context.queryClient.ensureQueryData(getAnalyticsFunnelKpisQueryOptions(params.workspaceId, undefined, filter)),
      context.queryClient.ensureQueryData(listFunnelsQueryOptions(params.workspaceId)),
    ])
  },
})

function RouteComponent() {
  const params = Route.useParams()
  const navigate = useNavigate({ from: Route.fullPath })
  const deps = Route.useLoaderDeps()

  const filter = React.useMemo(
    () => ({ startDate: deps.startDate, endDate: deps.endDate }),
    [deps.startDate, deps.endDate],
  )

  const granularity = React.useMemo(
    () => computeGranularity(new Date(deps.startDate), new Date(deps.endDate)),
    [deps.startDate, deps.endDate],
  )

  const dateRange = React.useMemo<DateRangePickerValue>(
    () => ({
      preset: deps.period,
      from: new Date(deps.startDate),
      to: new Date(deps.endDate),
    }),
    [deps.period, deps.startDate, deps.endDate],
  )

  const handleDateRangeChange = React.useCallback(
    (value: DateRangePickerValue) => {
      navigate({
        search: (prev) => ({
          ...prev,
          ...(value.preset
            ? { period: value.preset as any, from: undefined, to: undefined }
            : { period: undefined, from: formatDateForSearch(value.from), to: formatDateForSearch(value.to) }),
        }),
      })
    },
    [navigate],
  )

  const kpisQuery = useSuspenseQuery(getAnalyticsKpisQueryOptions(params.workspaceId, filter))
  const timeseriesQuery = useSuspenseQuery(
    getAnalyticsTimeseriesQueryOptions(params.workspaceId, undefined, filter, granularity),
  )
  const funnelKpisQuery = useSuspenseQuery(getAnalyticsFunnelKpisQueryOptions(params.workspaceId, undefined, filter))
  const funnelsQuery = useSuspenseQuery(listFunnelsQueryOptions(params.workspaceId))

  const kpis = kpisQuery.data
  const timeseries = timeseriesQuery.data
  const funnelKpis = funnelKpisQuery.data
  const funnels = funnelsQuery.data ?? []

  const hasData = kpis !== null && kpis.total_visitors > 0

  const visitorsTimeseries = React.useMemo(() => {
    return timeseries.map((p) => ({ date: p.date, value: p.visitors }))
  }, [timeseries])

  const funnelRows = React.useMemo(() => {
    const funnelMap = new Map(funnels.map((f) => [f.id, f]))
    return funnelKpis
      .filter((fk) => fk.total_visitors > 0)
      .map((fk) => ({
        ...fk,
        title: funnelMap.get(fk.funnel_id)?.title ?? fk.funnel_id,
      }))
      .sort((a, b) => b.total_visitors - a.total_visitors || a.title.localeCompare(b.title))
  }, [funnelKpis, funnels])

  return (
    <div className="flex h-full w-full max-w-4xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Dashboard</Heading.Title>
        </Heading.Content>
        <Heading.Actions>
          <DateRangePicker value={dateRange} onValueChange={handleDateRangeChange} align="end" />
        </Heading.Actions>
      </Heading.Root>

      <div className="flex flex-col gap-2 rounded-3xl bg-muted p-2">
        {!hasData ? (
          <Card.Root>
            <Card.Content>
              <Empty.Root>
                <Empty.Header>
                  <Empty.Media variant="icon">
                    <ChartBarIcon />
                  </Empty.Media>
                  <Empty.Title>No data for this period</Empty.Title>
                  <Empty.Description>
                    No traffic was recorded for this time range. Try selecting a different period.
                  </Empty.Description>
                </Empty.Header>
              </Empty.Root>
            </Card.Content>
          </Card.Root>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Visitors', value: formatNumber(kpis.total_visitors, true) },
                { label: 'Starts', value: formatNumber(kpis.total_starts, true) },
                { label: 'Completions', value: formatNumber(kpis.total_completions, true) },
                { label: 'Start Rate', value: formatPercentage(Math.min(kpis.start_rate, 100)) },
                {
                  label: 'Completion Rate',
                  value: formatPercentage(Math.min(kpis.completion_rate, 100)),
                  secondary: formatPercentage(
                    Math.min(kpis.total_starts > 0 ? (kpis.total_completions / kpis.total_starts) * 100 : 0, 100),
                  ),
                },
              ].map((card) => (
                <Card.Root key={card.label} size="sm">
                  <Card.Header>
                    <Card.Title className="text-muted-foreground">{card.label}</Card.Title>
                    <Card.Description className="font-medium">
                      <span className="text-foreground">{card.value}</span>
                      {'secondary' in card && card.secondary && (
                        <span className="text-sm text-muted-foreground"> ({card.secondary})</span>
                      )}
                    </Card.Description>
                  </Card.Header>
                </Card.Root>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Orders', value: formatNumber(kpis.total_orders, true) },
                { label: 'Revenue', value: formatCurrency(kpis.total_revenue) },
                {
                  label: 'Conversion Rate',
                  value: formatPercentage(Math.min(kpis.conversion_rate, 100)),
                  secondary: formatPercentage(
                    Math.min(kpis.total_starts > 0 ? (kpis.total_orders / kpis.total_starts) * 100 : 0, 100),
                  ),
                },
                { label: 'Revenue per Visitor', value: formatCurrency(kpis.revenue_per_visitor) },
                { label: 'Average Order Value', value: formatCurrency(kpis.avg_order_value) },
              ].map((card) => (
                <Card.Root key={card.label} size="sm">
                  <Card.Header>
                    <Card.Title className="text-muted-foreground">{card.label}</Card.Title>
                    <Card.Description className="font-medium">
                      <span className="text-foreground">{card.value}</span>
                      {'secondary' in card && card.secondary && (
                        <span className="text-sm text-muted-foreground"> ({card.secondary})</span>
                      )}
                    </Card.Description>
                  </Card.Header>
                </Card.Root>
              ))}
            </div>

            <Card.Root className="pb-0!" size="sm">
              <Card.Header>
                <Card.Title>Visits</Card.Title>
              </Card.Header>
              <Card.Content className="px-0!">
                <Chart.Container config={chartConfig} height={256}>
                  <LineChart data={visitorsTimeseries} margin={{ top: 8, right: 24, bottom: 12, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => formatDateForChart(v, granularity)}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={Math.max(0, Math.ceil(visitorsTimeseries.length / 8) - 1)}
                      padding={{ left: 10, right: 10 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={50}
                      allowDecimals={false}
                      tickFormatter={(v) => formatNumber(v, true)}
                    />
                    <Chart.Tooltip
                      content={(props) => (
                        <Chart.TooltipContent
                          {...props}
                          labelFormatter={(label) => formatDateForChart(String(label), granularity)}
                          formatter={(value) => (
                            <>
                              <span className="text-muted-foreground">Visits</span>
                              <span className="font-mono font-medium tabular-nums">{formatNumber(Number(value))}</span>
                            </>
                          )}
                        />
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-visitors)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </LineChart>
                </Chart.Container>
              </Card.Content>
            </Card.Root>

            <Card.Root size="sm">
              <Card.Content className="-mx-0.5 -mt-2.5 -mb-2">
                <Table.Root className="table-fixed">
                  <Table.Header>
                    <Table.Row className="hover:bg-transparent">
                      <Table.Head className="w-[28%]">Funnel</Table.Head>
                      <Table.Head className="w-[12%] text-right">Visits</Table.Head>
                      <Table.Head className="w-[12%] text-right">Orders</Table.Head>
                      <Table.Head className="w-[12%] text-right">SR</Table.Head>
                      <Table.Head className="w-[12%] text-right">CR</Table.Head>
                      <Table.Head className="w-[12%] text-right">CVR</Table.Head>
                      <Table.Head className="w-[12%] text-right">RPV</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {funnelRows.length === 0 ? (
                      <Table.Row className="hover:bg-transparent">
                        <Table.Cell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No data has been collected
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      funnelRows.map((funnel) => (
                        <Table.Row key={funnel.funnel_id} className="hover:bg-transparent">
                          <Table.Cell className="truncate font-medium">
                            <Link
                              className="hover:underline"
                              to="/workspace/$workspaceId/funnels/$id/insights"
                              params={{ workspaceId: params.workspaceId, id: funnel.funnel_id }}
                            >
                              {funnel.title}
                            </Link>
                          </Table.Cell>
                          <Table.Cell className="text-right">{formatNumber(funnel.total_visitors, true)}</Table.Cell>
                          <Table.Cell className="text-right">{formatNumber(funnel.total_orders, true)}</Table.Cell>
                          <Table.Cell className="text-right">
                            {formatPercentage(Math.min(funnel.start_rate, 100))}
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            {formatPercentage(Math.min(funnel.completion_rate, 100))}
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            {formatPercentage(Math.min(funnel.conversion_rate, 100))}
                          </Table.Cell>
                          <Table.Cell className="text-right">{formatCurrency(funnel.revenue_per_visitor)}</Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table.Root>
              </Card.Content>
            </Card.Root>
          </>
        )}
      </div>
    </div>
  )
}
