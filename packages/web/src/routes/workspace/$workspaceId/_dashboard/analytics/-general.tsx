import { Card } from '@/components/ui/card'
import { Chart, type ChartConfig } from '@/components/ui/chart'
import { Empty } from '@/components/ui/empty'

import { Resource } from '@shopfunnel/resource'
import { IconChartBar as ChartBarIcon } from '@tabler/icons-react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { z } from 'zod'
import { formatNumber, formatPercentage } from './-common'

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

export function computeGranularity(from: Date, to: Date): 'hour' | 'day' {
  const durationMs = to.getTime() - from.getTime()
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000
  return durationMs <= twoDaysMs ? 'hour' : 'day'
}

const chartConfig = {
  visitors: { label: 'Visitors', color: 'var(--color-chart-1)' },
  start_rate: { label: 'Start Rate', color: 'var(--color-chart-1)' },
  completion_rate: { label: 'Completion Rate', color: 'var(--color-chart-2)' },
  conversion_rate: { label: 'CVR', color: 'var(--color-chart-3)' },
  rpv: { label: 'RPV', color: 'var(--color-chart-4)' },
  aov: { label: 'AOV', color: 'var(--color-chart-5)' },
} satisfies ChartConfig

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
      funnelId: z.string().optional(),
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
    if (data.funnelId) params.set('funnel_id', data.funnelId)

    const response = await fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/analytics_kpis.json?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = (await response.json()) as { data: AnalyticsKpis[] }
    return json.data?.[0] ?? null
  })

export const getAnalyticsKpisQueryOptions = (
  workspaceId: string,
  funnelId: string | undefined,
  filter: { startDate: string; endDate: string },
) =>
  queryOptions({
    queryKey: ['analytics-kpis', workspaceId, funnelId ?? 'all', filter.startDate, filter.endDate],
    queryFn: () => getAnalyticsKpis({ data: { workspaceId, funnelId, filter } }),
  })

type TimeseriesPoint = {
  date: string
  visitors: number
  starts: number
  completions: number
  orders: number
  total_revenue: number
}

const getAnalyticsTimeseries = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: z.string(),
      funnelId: z.string().optional(),
      filter: z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
      granularity: z.enum(['hour', 'day']),
    }),
  )
  .handler(async ({ data }) => {
    const token = Resource.TINYBIRD_TOKEN.value
    const params = new URLSearchParams({
      workspace_id: data.workspaceId,
      start_date: data.filter.startDate,
      end_date: data.filter.endDate,
      granularity: data.granularity,
    })
    if (data.funnelId) params.set('funnel_id', data.funnelId)

    const response = await fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/analytics_timeseries.json?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = (await response.json()) as { data: TimeseriesPoint[] }
    return json.data ?? []
  })

export const getAnalyticsTimeseriesQueryOptions = (
  workspaceId: string,
  funnelId: string | undefined,
  filter: { startDate: string; endDate: string },
  granularity: 'hour' | 'day',
) =>
  queryOptions({
    queryKey: ['analytics-timeseries', workspaceId, funnelId ?? 'all', filter.startDate, filter.endDate, granularity],
    queryFn: () => getAnalyticsTimeseries({ data: { workspaceId, funnelId, filter, granularity } }),
  })

function formatValue(value: number, format: 'currency' | 'number' | 'percentage'): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value)
    case 'number':
      return formatNumber(value, true)
    case 'percentage':
      return formatPercentage(Math.min(value, 100))
  }
}

function formatAxisTick(value: number, format: 'currency' | 'number' | 'percentage'): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value, true)
    case 'number':
      return formatNumber(value, true)
    case 'percentage':
      return `${value}%`
  }
}

function RateCard({
  title,
  value,
  secondaryValue,
  timeseries,
  dataKey,
  hasData,
  granularity,
  format,
}: {
  title: string
  value: number | null
  secondaryValue?: string
  timeseries: { date: string; value: number }[]
  dataKey: string
  hasData: boolean
  granularity: 'hour' | 'day'
  format: 'currency' | 'number' | 'percentage'
}) {
  const config = {
    [dataKey]: chartConfig[dataKey as keyof typeof chartConfig],
  } satisfies ChartConfig

  const formattedValue = value === null ? '---' : formatValue(value, format)

  return (
    <Card.Root className="pb-0!" size="sm">
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        <Card.Description>
          <span className="text-lg font-semibold text-foreground">{formattedValue}</span>
          {secondaryValue && <span className="text-muted-foreground"> ({secondaryValue})</span>}
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
              <YAxis
                tickLine={false}
                axisLine={false}
                width={format === 'currency' ? 65 : 50}
                tickFormatter={(v) => formatAxisTick(Number(v), format)}
                domain={format === 'percentage' ? [0, 100] : ['auto', 'auto']}
              />
              <Chart.Tooltip
                content={(props) => (
                  <Chart.TooltipContent
                    {...props}
                    labelFormatter={(label) => formatDateForChart(String(label), granularity)}
                    formatter={(value) => (
                      <>
                        <span className="text-muted-foreground">{title}</span>
                        <span className="font-mono font-medium tabular-nums">{formatValue(Number(value), format)}</span>
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

type GeneralTabProps = {
  workspaceId: string
  funnelId: string | undefined
  filter: { startDate: string; endDate: string }
}

export function GeneralTab({ workspaceId, funnelId, filter }: GeneralTabProps) {
  const granularity = React.useMemo(
    () => computeGranularity(new Date(filter.startDate), new Date(filter.endDate)),
    [filter.startDate, filter.endDate],
  )

  const kpisQuery = useSuspenseQuery(getAnalyticsKpisQueryOptions(workspaceId, funnelId, filter))
  const timeseriesQuery = useSuspenseQuery(
    getAnalyticsTimeseriesQueryOptions(workspaceId, funnelId, filter, granularity),
  )

  const kpis = kpisQuery.data
  const timeseries = timeseriesQuery.data
  const hasData = kpis !== null && kpis.total_visitors > 0

  const visitorsTimeseries = React.useMemo(() => {
    return timeseries.map((p) => ({ date: p.date, value: p.visitors }))
  }, [timeseries])

  const startRateTimeseries = React.useMemo(() => {
    return timeseries
      .filter((p) => p.visitors > 0)
      .map((p) => ({ date: p.date, value: Math.min((p.starts / p.visitors) * 100, 100) }))
  }, [timeseries])

  const completionRateTimeseries = React.useMemo(() => {
    return timeseries
      .filter((p) => p.visitors > 0)
      .map((p) => ({ date: p.date, value: Math.min((p.completions / p.visitors) * 100, 100) }))
  }, [timeseries])

  const conversionRateTimeseries = React.useMemo(() => {
    return timeseries
      .filter((p) => p.visitors > 0)
      .map((p) => ({ date: p.date, value: Math.min((p.orders / p.visitors) * 100, 100) }))
  }, [timeseries])

  const rpvTimeseries = React.useMemo(() => {
    return timeseries.filter((p) => p.visitors > 0).map((p) => ({ date: p.date, value: p.total_revenue / p.visitors }))
  }, [timeseries])

  const aovTimeseries = React.useMemo(() => {
    return timeseries.filter((p) => p.orders > 0).map((p) => ({ date: p.date, value: p.total_revenue / p.orders }))
  }, [timeseries])

  return (
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
              { label: 'Orders', value: formatNumber(kpis.total_orders, true) },
              { label: 'Revenue', value: formatCurrency(kpis.total_revenue) },
            ].map((card) => (
              <Card.Root key={card.label} size="sm">
                <Card.Header>
                  <Card.Title className="text-muted-foreground">{card.label}</Card.Title>
                  <Card.Description className="font-medium">
                    <span className="text-foreground">{card.value}</span>
                  </Card.Description>
                </Card.Header>
              </Card.Root>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <RateCard
              title="Visits"
              value={kpis.total_visitors}
              timeseries={visitorsTimeseries}
              dataKey="visitors"
              hasData={hasData}
              granularity={granularity}
              format="number"
            />
            <RateCard
              title="Start Rate"
              value={kpis.start_rate}
              timeseries={startRateTimeseries}
              dataKey="start_rate"
              hasData={hasData}
              granularity={granularity}
              format="percentage"
            />
            <RateCard
              title="Completion Rate"
              value={kpis.completion_rate}
              secondaryValue={formatPercentage(
                Math.min(kpis.total_starts > 0 ? (kpis.total_completions / kpis.total_starts) * 100 : 0, 100),
              )}
              timeseries={completionRateTimeseries}
              dataKey="completion_rate"
              hasData={hasData}
              granularity={granularity}
              format="percentage"
            />
            <RateCard
              title="Conversion Rate"
              value={kpis.conversion_rate}
              secondaryValue={formatPercentage(
                Math.min(kpis.total_starts > 0 ? (kpis.total_orders / kpis.total_starts) * 100 : 0, 100),
              )}
              timeseries={conversionRateTimeseries}
              dataKey="conversion_rate"
              hasData={hasData}
              granularity={granularity}
              format="percentage"
            />
            <RateCard
              title="Revenue per Visitor"
              value={kpis.revenue_per_visitor}
              timeseries={rpvTimeseries}
              dataKey="rpv"
              hasData={hasData}
              granularity={granularity}
              format="currency"
            />
            <RateCard
              title="Average Order Value"
              value={kpis.avg_order_value}
              timeseries={aovTimeseries}
              dataKey="aov"
              hasData={hasData}
              granularity={granularity}
              format="currency"
            />
          </div>
        </>
      )}
    </div>
  )
}
