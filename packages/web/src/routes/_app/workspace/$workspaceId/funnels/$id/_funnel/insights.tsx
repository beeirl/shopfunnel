import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Select } from '@/components/ui/select'
import { Table } from '@/components/ui/table'
import { withActor } from '@/context/auth.withActor'
import { getDateRange } from '@/routes/_app/workspace/$workspaceId/-common'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Resource } from '@shopfunnel/resource'
import { IconChartBar as ChartBarIcon } from '@tabler/icons-react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const getPublishedVersionsQuery = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.getPublishedVersionNumbers(data.funnelId), data.workspaceId)
  })

const getPublishedVersionsQueryOptions = (workspaceId: string, funnelId: string) =>
  queryOptions({
    queryKey: ['funnel-published-version-numbers', workspaceId, funnelId],
    queryFn: () => getPublishedVersionsQuery({ data: { workspaceId, funnelId } }),
  })

const getInsights = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: z.string(),
      funnelId: z.string(),
      funnelVersion: z.number(),
      filter: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const token = Resource.TINYBIRD_TOKEN.value
    const params = new URLSearchParams({
      workspace_id: data.workspaceId,
      funnel_id: data.funnelId,
      funnel_version: String(data.funnelVersion),
    })
    if (data.filter.startDate) params.set('start_date', data.filter.startDate)
    if (data.filter.endDate) params.set('end_date', data.filter.endDate)

    const [kpisResponse, pagesResponse] = await Promise.all([
      fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/funnel_kpis.json?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/funnel_pages.json?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    const kpisJson = (await kpisResponse.json()) as any
    const pagesJson = (await pagesResponse.json()) as any

    return { kpis: kpisJson.data?.[0], pages: pagesJson.data }
  })

const getInsightsQueryOptions = (
  workspaceId: string,
  funnelId: string,
  funnelVersion: number,
  filter: { startDate: string | undefined; endDate: string | undefined },
) =>
  queryOptions({
    queryKey: ['insights', workspaceId, funnelId, funnelVersion, filter.startDate, filter.endDate],
    queryFn: () => getInsights({ data: { workspaceId, funnelId, funnelVersion, filter } }),
  })

function formatDuration(ms: number): string {
  if (ms <= 0) return '0:00 min'
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')} min`
}

function formatNumber(value: number, compact = false): string {
  if (compact && value >= 1000) {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  }
  return value.toLocaleString('en-US')
}

function formatPercentage(value: number): string {
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return `${formatted}%`
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

type KpiItem = {
  label: string
  value: string
  secondary?: string
}

type DateFilterOption = {
  label: string
  value: 'today' | 'yesterday' | '7d' | '30d' | 'all'
  range: () => { startDate: string | undefined; endDate: string | undefined }
}

const DATE_FILTER_OPTIONS: DateFilterOption[] = [
  {
    label: 'Today',
    value: 'today',
    range: () => {
      const today = new Date()
      return getDateRange(today, today)
    },
  },
  {
    label: 'Yesterday',
    value: 'yesterday',
    range: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      return getDateRange(yesterday, yesterday)
    },
  },
  {
    label: 'Last 7 days',
    value: '7d',
    range: () => {
      const today = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 6)
      return getDateRange(weekAgo, today)
    },
  },
  {
    label: 'Last 30 days',
    value: '30d',
    range: () => {
      const today = new Date()
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 29)
      return getDateRange(monthAgo, today)
    },
  },
  {
    label: 'All time',
    value: 'all',
    range: () => ({ startDate: undefined, endDate: undefined }),
  },
]

export const Route = createFileRoute('/_app/workspace/$workspaceId/funnels/$id/_funnel/insights')({
  validateSearch: (search) =>
    z
      .object({
        range: z.enum(['today', 'yesterday', '7d', '30d', 'all']).optional(),
      })
      .parse(search),
  loaderDeps: ({ search }) => ({ range: search.range }),
  component: RouteComponent,
  loader: async ({ context, params, deps }) => {
    const [publishedVersions] = await Promise.all([
      context.queryClient.ensureQueryData(getPublishedVersionsQueryOptions(params.workspaceId, params.id)),
    ])
    const latestPublishedVersion = publishedVersions.at(-1)
    if (latestPublishedVersion) {
      const filterOption = DATE_FILTER_OPTIONS.find((o) => o.value === (deps.range ?? 'today'))!
      const filter = filterOption.range()
      await context.queryClient.ensureQueryData(
        getInsightsQueryOptions(params.workspaceId, params.id, latestPublishedVersion, filter),
      )
    }
  },
})

function Insights({
  workspaceId,
  funnelId,
  funnelVersion,
  filter,
}: {
  workspaceId: string
  funnelId: string
  funnelVersion: number
  filter: { startDate: string | undefined; endDate: string | undefined }
}) {
  const insightsQuery = useSuspenseQuery(getInsightsQueryOptions(workspaceId, funnelId, funnelVersion, filter))
  const insights = insightsQuery.data
  const hasData = insights?.kpis?.total_views > 0

  const trafficKpis: KpiItem[] = hasData
    ? [
        { label: 'Views', value: formatNumber(insights.kpis.total_views, true) },
        { label: 'Started', value: formatNumber(insights.kpis.total_starts, true) },
        { label: 'Completions', value: formatNumber(insights.kpis.total_completions, true) },
        { label: 'Start Rate', value: formatPercentage(Math.min(insights.kpis.start_rate, 100)) },
        {
          label: 'Completion Rate',
          value: formatPercentage(Math.min(insights.kpis.completion_rate, 100)),
          secondary: formatPercentage(Math.min(insights.kpis.completion_rate_of_starters, 100)),
        },
      ]
    : []

  const conversionKpis: KpiItem[] = hasData
    ? [
        {
          label: 'Orders',
          value: formatNumber(insights.kpis.total_orders, true),
        },
        {
          label: 'Revenue',
          value: formatCurrency(insights.kpis.total_revenue),
        },
        {
          label: 'Conversion Rate',
          value: formatPercentage(Math.min(insights.kpis.conversion_rate, 100)),
          secondary: formatPercentage(Math.min(insights.kpis.conversion_rate_of_starters, 100)),
        },
        {
          label: 'Revenue/Visitor',
          value: formatCurrency(insights.kpis.revenue_per_visitor),
        },
        {
          label: 'AOV',
          value: formatCurrency(insights.kpis.avg_order_value),
        },
      ]
    : []

  return hasData ? (
    <div className="flex flex-col gap-2 rounded-3xl bg-muted p-2">
      <div className="grid grid-cols-5 gap-2">
        {trafficKpis.map((kpi) => (
          <Card.Root key={kpi.label} size="sm">
            <Card.Header>
              <Card.Title className="text-muted-foreground">{kpi.label}</Card.Title>
              <Card.Description className="font-medium">
                <span className="text-foreground">{kpi.value}</span>
                {kpi.secondary && <span className="text-sm text-muted-foreground"> ({kpi.secondary})</span>}
              </Card.Description>
            </Card.Header>
          </Card.Root>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {conversionKpis.map((kpi) => (
          <Card.Root key={kpi.label} size="sm">
            <Card.Header>
              <Card.Title className="text-muted-foreground">{kpi.label}</Card.Title>
              <Card.Description className="font-medium">
                <span className="text-foreground">{kpi.value}</span>
                {kpi.secondary && <span className="text-sm text-muted-foreground"> ({kpi.secondary})</span>}
              </Card.Description>
            </Card.Header>
          </Card.Root>
        ))}
      </div>
      {insights.pages.length > 0 && (
        <Card.Root size="sm">
          <Card.Content className="-mx-0.5 -mt-2.5 -mb-2">
            <Table.Root className="table-fixed">
              <Table.Header>
                <Table.Row className="hover:bg-transparent">
                  <Table.Head className="w-[40%]">Page</Table.Head>
                  <Table.Head className="w-[15%] text-right">Views</Table.Head>
                  <Table.Head className="w-[15%] text-right">Exits</Table.Head>
                  <Table.Head className="w-[15%] text-right">Drop-off</Table.Head>
                  <Table.Head className="w-[15%] text-right">Avg time</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {insights.pages.map((page) => {
                  const isExternal = page.page_id === 'external'
                  return (
                    <Table.Row key={page.page_id} className="hover:bg-transparent">
                      <Table.Cell className="truncate">{page.page_name || page.page_id}</Table.Cell>
                      <Table.Cell className="text-right">{formatNumber(page.page_views)}</Table.Cell>
                      <Table.Cell className="text-right">{isExternal ? '-' : formatNumber(page.exits)}</Table.Cell>
                      <Table.Cell className="text-right">
                        {isExternal ? '-' : formatPercentage(page.dropoff_rate)}
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        {isExternal ? '-' : formatDuration(page.avg_duration)}
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          </Card.Content>
        </Card.Root>
      )}
    </div>
  ) : (
    <div className="rounded-3xl bg-muted p-2">
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
    </div>
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

  const publishedVersionsQuery = useSuspenseQuery(getPublishedVersionsQueryOptions(params.workspaceId, params.id))
  const latestPublishedVersion = publishedVersionsQuery.data.at(-1)

  const rangeOption = DATE_FILTER_OPTIONS.find((o) => o.value === range)!
  const dateRange = rangeOption.range()

  return (
    <div className="p-6 sm:pt-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">Insights</div>
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
        </div>
        {latestPublishedVersion ? (
          <Insights
            workspaceId={params.workspaceId}
            funnelId={params.id}
            funnelVersion={latestPublishedVersion}
            filter={dateRange}
          />
        ) : (
          <div className="rounded-3xl bg-muted p-2">
            <Card.Root>
              <Card.Content>
                <Empty.Root>
                  <Empty.Header>
                    <Empty.Media variant="icon">
                      <ChartBarIcon />
                    </Empty.Media>
                    <Empty.Title>No insights available yet</Empty.Title>
                    <Empty.Description>
                      Publish your funnel to start collecting data. You'll see views, completion rates, and drop-off
                      analysis here.
                    </Empty.Description>
                  </Empty.Header>
                </Empty.Root>
              </Card.Content>
            </Card.Root>
          </div>
        )}
      </div>
    </div>
  )
}
