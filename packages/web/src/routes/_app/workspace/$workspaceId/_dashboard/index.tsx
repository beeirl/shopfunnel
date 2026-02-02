import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Chart, ChartConfig } from '@/components/ui/chart'
import { Select } from '@/components/ui/select'
import { Table } from '@/components/ui/table'
import { withActor } from '@/context/auth.withActor'
import { cn } from '@/lib/utils'
import { formatDateForChart, getDateRange } from '@/routes/_app/workspace/$workspaceId/-common'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Resource } from '@shopfunnel/resource'
import { IconArrowDown as ArrowDownIcon, IconArrowUp as ArrowUpIcon, IconMinus as MinusIcon } from '@tabler/icons-react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { z } from 'zod'
import { Heading } from './-components/heading'

type FunnelKpi = {
  funnel_id: string
  views: number
  starts: number
  completions: number
  start_rate: number
  completion_rate: number
}

type TimeseriesPoint = {
  date: string
  views: number
  starts: number
  completions: number
  orders: number
}

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

const getWorkspaceAnalytics = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: z.string(),
      filter: z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
      previousFilter: z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
      granularity: z.enum(['hour', 'day']),
    }),
  )
  .handler(async ({ data }) => {
    const token = Resource.TINYBIRD_TOKEN.value

    const currentParams = new URLSearchParams({
      workspace_id: data.workspaceId,
      start_date: data.filter.startDate,
      end_date: data.filter.endDate,
    })

    const previousParams = new URLSearchParams({
      workspace_id: data.workspaceId,
      start_date: data.previousFilter.startDate,
      end_date: data.previousFilter.endDate,
    })

    const timeseriesParams = new URLSearchParams({
      workspace_id: data.workspaceId,
      start_date: data.filter.startDate,
      end_date: data.filter.endDate,
      granularity: data.granularity,
    })

    const [currentKpisResponse, previousKpisResponse, timeseriesResponse] = await Promise.all([
      fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/workspace_kpis.json?${currentParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/workspace_kpis.json?${previousParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/workspace_kpis_timeseries.json?${timeseriesParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    const currentKpisJson = (await currentKpisResponse.json()) as { data: FunnelKpi[] }
    const previousKpisJson = (await previousKpisResponse.json()) as { data: FunnelKpi[] }
    const timeseriesJson = (await timeseriesResponse.json()) as { data: TimeseriesPoint[] }

    return {
      current: currentKpisJson.data ?? [],
      previous: previousKpisJson.data ?? [],
      timeseries: timeseriesJson.data ?? [],
    }
  })

const getWorkspaceAnalyticsQueryOptions = (
  workspaceId: string,
  filter: { startDate: string; endDate: string },
  previousFilter: { startDate: string; endDate: string },
  granularity: 'hour' | 'day',
) =>
  queryOptions({
    queryKey: ['workspace-analytics', workspaceId, filter.startDate, filter.endDate, granularity],
    queryFn: () => getWorkspaceAnalytics({ data: { workspaceId, filter, previousFilter, granularity } }),
  })

function formatNumber(value: number, compact = false): string {
  if (compact && value >= 1000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value)
  }
  return value.toLocaleString('en-US')
}

function formatPercentage(value: number): string {
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
  return `${formatted}%`
}

function formatDelta(current: number, previous: number): { value: string; isPositive: boolean; isZero: boolean } {
  if (previous === 0) {
    return { value: '0%', isPositive: true, isZero: true }
  }
  const delta = ((current - previous) / previous) * 100
  const isZero = Math.abs(delta) < 0.5
  return {
    value: `${Math.abs(Math.round(delta))}%`,
    isPositive: delta >= 0,
    isZero,
  }
}

type DateFilterOption = {
  label: string
  value: 'today' | 'yesterday' | '7d' | '30d'
  granularity: 'hour' | 'day'
  range: () => { startDate: string; endDate: string }
  previousRange: () => { startDate: string; endDate: string }
}

const DATE_FILTER_OPTIONS: DateFilterOption[] = [
  {
    label: 'Today',
    value: 'today',
    granularity: 'hour',
    range: () => {
      const today = new Date()
      return getDateRange(today, today)
    },
    previousRange: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      return getDateRange(yesterday, yesterday)
    },
  },
  {
    label: 'Yesterday',
    value: 'yesterday',
    granularity: 'hour',
    range: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      return getDateRange(yesterday, yesterday)
    },
    previousRange: () => {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      return getDateRange(twoDaysAgo, twoDaysAgo)
    },
  },
  {
    label: 'Last 7 days',
    value: '7d',
    granularity: 'day',
    range: () => {
      const today = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 6)
      return getDateRange(weekAgo, today)
    },
    previousRange: () => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13)
      return getDateRange(twoWeeksAgo, weekAgo)
    },
  },
  {
    label: 'Last 30 days',
    value: '30d',
    granularity: 'day',
    range: () => {
      const today = new Date()
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 29)
      return getDateRange(monthAgo, today)
    },
    previousRange: () => {
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 59)
      return getDateRange(twoMonthsAgo, monthAgo)
    },
  },
]

export const Route = createFileRoute('/_app/workspace/$workspaceId/_dashboard/')({
  staticData: { title: 'Home' },
  validateSearch: (search) =>
    z
      .object({
        range: z.enum(['today', 'yesterday', '7d', '30d']).optional(),
      })
      .parse(search),
  loaderDeps: ({ search }) => ({ range: search.range }),
  component: RouteComponent,
  loader: async ({ context, params, deps }) => {
    const filterOption = DATE_FILTER_OPTIONS.find((o) => o.value === (deps.range ?? 'today'))!
    const filter = filterOption.range()
    const previousFilter = filterOption.previousRange()
    const granularity = filterOption.granularity

    await Promise.all([
      context.queryClient.ensureQueryData(listFunnelsQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(
        getWorkspaceAnalyticsQueryOptions(params.workspaceId, filter, previousFilter, granularity),
      ),
    ])
  },
})

type CountMetric = 'views' | 'starts' | 'completions' | 'orders'

const COUNT_METRICS: { key: CountMetric; label: string; clickable: boolean }[] = [
  { key: 'views', label: 'Views', clickable: true },
  { key: 'starts', label: 'Starts', clickable: true },
  { key: 'completions', label: 'Completions', clickable: true },
  { key: 'orders', label: 'Orders', clickable: false },
]

const chartConfig = {
  views: {
    label: 'Views',
    color: 'var(--color-primary)',
  },
  starts: {
    label: 'Starts',
    color: 'var(--color-chart-2)',
  },
  completions: {
    label: 'Completions',
    color: 'var(--color-chart-3)',
  },
  start_rate: {
    label: 'Start Rate',
    color: 'var(--color-primary)',
  },
  completion_rate: {
    label: 'Completion Rate',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig

function DeltaBadge({ delta }: { delta: { value: string; isPositive: boolean; isZero: boolean } }) {
  const Icon = delta.isZero ? MinusIcon : delta.isPositive ? ArrowUpIcon : ArrowDownIcon

  return (
    <Badge
      variant="outline"
      className={cn(
        delta.isZero
          ? 'text-muted-foreground'
          : delta.isPositive
            ? 'border-green-500/20 bg-green-500/10 text-green-600'
            : 'border-red-500/20 bg-red-500/10 text-red-600',
      )}
    >
      <Icon data-icon="inline-start" />
      {delta.value}
    </Badge>
  )
}

function MetricValue({
  value,
  delta,
  isPercentage = false,
  align = 'left',
  badgeSide = 'left',
}: {
  value: number | null
  delta: { value: string; isPositive: boolean; isZero: boolean } | null
  isPercentage?: boolean
  align?: 'left' | 'right'
  badgeSide?: 'left' | 'right'
}) {
  if (value === null) {
    return <span className="text-muted-foreground">---</span>
  }

  const showBadge = delta && !delta.isZero

  return (
    <span className={cn('inline-flex items-center gap-1.5', align === 'right' && 'justify-end')}>
      {badgeSide === 'left' && showBadge && <DeltaBadge delta={delta} />}
      <span>{isPercentage ? formatPercentage(value) : formatNumber(value, true)}</span>
      {badgeSide === 'right' && showBadge && <DeltaBadge delta={delta} />}
    </span>
  )
}

function RateCard({
  title,
  value,
  delta,
  timeseries,
  dataKey,
  hasData,
  granularity,
}: {
  title: string
  value: number | null
  delta: { value: string; isPositive: boolean; isZero: boolean } | null
  timeseries: { date: string; value: number }[]
  dataKey: string
  hasData: boolean
  granularity: 'hour' | 'day'
}) {
  const config = {
    [dataKey]: chartConfig[dataKey as keyof typeof chartConfig],
  } satisfies ChartConfig

  return (
    <Card.Root className="pb-0!" size="sm">
      <Card.Header>
        <Card.Title className="text-muted-foreground">{title}</Card.Title>
        <Card.Description className="text-lg font-semibold text-foreground">
          <MetricValue value={value} delta={delta} isPercentage badgeSide="right" />
        </Card.Description>
      </Card.Header>
      <Card.Content className="px-0!">
        {hasData && timeseries.length >= 2 ? (
          <Chart.Container config={config} height={256}>
            <LineChart data={timeseries} margin={{ top: 8, right: 24, bottom: 12, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatDateForChart(v, granularity)}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis tickLine={false} axisLine={false} width={50} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Chart.Tooltip
                content={(props) => (
                  <Chart.TooltipContent
                    {...props}
                    labelFormatter={(label) => formatDateForChart(String(label), granularity)}
                    formatter={(value) => (
                      <>
                        <span className="text-muted-foreground">{title}</span>
                        <span className="font-mono font-medium tabular-nums">{formatPercentage(Number(value))}</span>
                      </>
                    )}
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={`var(--color-${dataKey})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </Chart.Container>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <span className="text-sm text-muted-foreground">No data has been collected</span>
          </div>
        )}
      </Card.Content>
    </Card.Root>
  )
}

function RouteComponent() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const range = search.range ?? 'today'

  const handleRangeChange = (value: typeof range) => {
    navigate({ search: { range: value } })
  }

  const funnelsQuery = useSuspenseQuery(listFunnelsQueryOptions(params.workspaceId))
  const funnels = funnelsQuery.data ?? []

  const rangeOption = DATE_FILTER_OPTIONS.find((o) => o.value === range)!
  const filter = rangeOption.range()
  const previousFilter = rangeOption.previousRange()
  const granularity = rangeOption.granularity

  const analyticsQuery = useSuspenseQuery(
    getWorkspaceAnalyticsQueryOptions(params.workspaceId, filter, previousFilter, granularity),
  )
  const { current, previous, timeseries } = analyticsQuery.data

  const [selectedMetric, setSelectedMetric] = React.useState<CountMetric>('views')

  const currentTotals = React.useMemo(() => {
    if (current.length === 0) return null
    const totalViews = current.reduce((sum, f) => sum + f.views, 0)
    const totalStarts = current.reduce((sum, f) => sum + f.starts, 0)
    const totalCompletions = current.reduce((sum, f) => sum + f.completions, 0)
    return {
      views: totalViews,
      starts: totalStarts,
      completions: totalCompletions,
      orders: 0, // No orders data yet
      start_rate: totalViews > 0 ? Math.min((totalStarts / totalViews) * 100, 100) : 0,
      completion_rate: totalStarts > 0 ? Math.min((totalCompletions / totalStarts) * 100, 100) : 0,
    }
  }, [current])

  const previousTotals = React.useMemo(() => {
    if (previous.length === 0) return null
    const totalViews = previous.reduce((sum, f) => sum + f.views, 0)
    const totalStarts = previous.reduce((sum, f) => sum + f.starts, 0)
    const totalCompletions = previous.reduce((sum, f) => sum + f.completions, 0)
    return {
      views: totalViews,
      starts: totalStarts,
      completions: totalCompletions,
      orders: 0,
      start_rate: totalViews > 0 ? Math.min((totalStarts / totalViews) * 100, 100) : 0,
      completion_rate: totalStarts > 0 ? Math.min((totalCompletions / totalStarts) * 100, 100) : 0,
    }
  }, [previous])

  const startRateTimeseries = React.useMemo(() => {
    return timeseries
      .filter((point) => point.views > 0)
      .map((point) => ({
        date: point.date,
        value: Math.min((point.starts / point.views) * 100, 100),
      }))
  }, [timeseries])

  const completionRateTimeseries = React.useMemo(() => {
    return timeseries
      .filter((point) => point.starts > 0)
      .map((point) => ({
        date: point.date,
        value: Math.min((point.completions / point.starts) * 100, 100),
      }))
  }, [timeseries])

  const previousByFunnel = React.useMemo(() => {
    const map = new Map<string, FunnelKpi>()
    for (const item of previous) {
      map.set(item.funnel_id, item)
    }
    return map
  }, [previous])

  const funnelMetrics = React.useMemo(() => {
    const currentByFunnel = new Map<string, FunnelKpi>()
    for (const item of current) {
      currentByFunnel.set(item.funnel_id, item)
    }

    return funnels
      .map((funnel) => {
        const currentData = currentByFunnel.get(funnel.id)
        const previousData = previousByFunnel.get(funnel.id)
        return {
          id: funnel.id,
          title: funnel.title,
          current: currentData ?? null,
          previous: previousData ?? null,
        }
      })
      .filter((funnel) => funnel.current !== null)
      .sort((a, b) => (b.current?.views ?? 0) - (a.current?.views ?? 0) || a.title.localeCompare(b.title))
  }, [funnels, current, previousByFunnel])

  const hasData = current.length > 0

  return (
    <div className="flex h-full w-full max-w-4xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Insights</Heading.Title>
        </Heading.Content>
        <Heading.Actions>
          <Select.Root items={DATE_FILTER_OPTIONS} value={range} onValueChange={handleRangeChange}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content align="end" alignItemWithTrigger={false}>
              <Select.Group>
                {DATE_FILTER_OPTIONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Heading.Actions>
      </Heading.Root>

      <div className="flex flex-col gap-2 rounded-3xl bg-muted p-2">
        <Card.Root size="sm">
          <Card.Content className="flex flex-col gap-4">
            <div className="-mx-4 border-b border-border px-4">
              <div className="flex">
                {COUNT_METRICS.map((metric) => {
                  const isSelected = selectedMetric === metric.key
                  const value = metric.key === 'orders' ? null : (currentTotals?.[metric.key] ?? null)
                  const delta =
                    metric.key === 'orders'
                      ? null
                      : currentTotals && previousTotals
                        ? formatDelta(currentTotals[metric.key], previousTotals[metric.key])
                        : null

                  if (!metric.clickable) {
                    return (
                      <div
                        key={metric.key}
                        className="relative flex flex-1 flex-col gap-0.5 pb-3 text-left text-muted-foreground"
                      >
                        <span className="text-sm font-medium">{metric.label}</span>
                        <span className="text-lg font-semibold">
                          <MetricValue value={value} delta={delta} badgeSide="right" />
                        </span>
                      </div>
                    )
                  }

                  return (
                    <button
                      key={metric.key}
                      onClick={() => setSelectedMetric(metric.key)}
                      className={cn(
                        'relative flex flex-1 flex-col gap-0.5 pb-3 text-left transition-colors',
                        isSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className="text-sm font-medium">{metric.label}</span>
                      <span className="text-lg font-semibold">
                        <MetricValue value={value} delta={delta} badgeSide="right" />
                      </span>
                      {isSelected && <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {hasData && timeseries.length >= 2 ? (
              <Chart.Container className="-mx-3 -mb-3" config={chartConfig} height={256}>
                <LineChart data={timeseries} margin={{ top: 0, right: 24, bottom: 12, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => formatDateForChart(v, granularity)}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
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
                        formatter={(value, name) => (
                          <>
                            <span className="text-muted-foreground">
                              {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                            </span>
                            <span className="font-mono font-medium tabular-nums">{formatNumber(Number(value))}</span>
                          </>
                        )}
                      />
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey={selectedMetric}
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </Chart.Container>
            ) : (
              <div className="flex h-64 items-center justify-center">
                <span className="text-sm text-muted-foreground">No data has been collected</span>
              </div>
            )}
          </Card.Content>
        </Card.Root>

        <div className="grid grid-cols-2 gap-2">
          <RateCard
            title="Start Rate"
            value={currentTotals?.start_rate ?? null}
            delta={
              currentTotals && previousTotals ? formatDelta(currentTotals.start_rate, previousTotals.start_rate) : null
            }
            timeseries={startRateTimeseries}
            dataKey="start_rate"
            hasData={hasData}
            granularity={granularity}
          />
          <RateCard
            title="Completion Rate"
            value={currentTotals?.completion_rate ?? null}
            delta={
              currentTotals && previousTotals
                ? formatDelta(currentTotals.completion_rate, previousTotals.completion_rate)
                : null
            }
            timeseries={completionRateTimeseries}
            dataKey="completion_rate"
            hasData={hasData}
            granularity={granularity}
          />
        </div>

        <Card.Root size="sm">
          <Card.Content className="-mx-0.5 -mt-2.5 -mb-2">
            <Table.Root className="table-fixed">
              <Table.Header>
                <Table.Row className="hover:bg-transparent">
                  <Table.Head className="w-[40%]">Funnel</Table.Head>
                  <Table.Head className="w-[20%] text-right">Views</Table.Head>
                  <Table.Head className="w-[20%] text-right">Start Rate</Table.Head>
                  <Table.Head className="w-[20%] text-right">Completion Rate</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {funnelMetrics.length === 0 ? (
                  <Table.Row className="hover:bg-transparent">
                    <Table.Cell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No data has been collected
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  funnelMetrics.map((funnel) => {
                    const currentStartRate = funnel.current ? Math.min(funnel.current.start_rate, 100) : null
                    const currentCompletionRate = funnel.current ? Math.min(funnel.current.completion_rate, 100) : null
                    const previousStartRate = funnel.previous ? Math.min(funnel.previous.start_rate, 100) : null
                    const previousCompletionRate = funnel.previous
                      ? Math.min(funnel.previous.completion_rate, 100)
                      : null

                    const viewsDelta =
                      funnel.current && funnel.previous
                        ? formatDelta(funnel.current.views, funnel.previous.views)
                        : null
                    const startRateDelta =
                      currentStartRate !== null && previousStartRate !== null
                        ? formatDelta(currentStartRate, previousStartRate)
                        : null
                    const completionRateDelta =
                      currentCompletionRate !== null && previousCompletionRate !== null
                        ? formatDelta(currentCompletionRate, previousCompletionRate)
                        : null

                    return (
                      <Table.Row key={funnel.id} className="hover:bg-transparent">
                        <Table.Cell className="truncate font-medium">
                          <Link
                            to="/workspace/$workspaceId/funnels/$id/insights"
                            params={{ workspaceId: params.workspaceId, id: funnel.id }}
                            className="hover:underline"
                          >
                            {funnel.title}
                          </Link>
                        </Table.Cell>
                        <Table.Cell className="text-right">
                          <MetricValue value={funnel.current?.views ?? null} delta={viewsDelta} align="right" />
                        </Table.Cell>
                        <Table.Cell className="text-right">
                          <MetricValue value={currentStartRate} delta={startRateDelta} isPercentage align="right" />
                        </Table.Cell>
                        <Table.Cell className="text-right">
                          <MetricValue
                            value={currentCompletionRate}
                            delta={completionRateDelta}
                            isPercentage
                            align="right"
                          />
                        </Table.Cell>
                      </Table.Row>
                    )
                  })
                )}
              </Table.Body>
            </Table.Root>
          </Card.Content>
        </Card.Root>
      </div>
    </div>
  )
}
