import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Select } from '@/components/ui/select'
import { Table } from '@/components/ui/table'
import { withActor } from '@/context/auth.withActor'
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
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
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
    if (data.filter.dateFrom) params.set('date_from', data.filter.dateFrom)
    if (data.filter.dateTo) params.set('date_to', data.filter.dateTo)

    const [kpisResponse, pagesResponse] = await Promise.all([
      fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/kpis.json?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/pages.json?${params}`, {
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
  filter: { dateFrom: string | undefined; dateTo: string | undefined },
) =>
  queryOptions({
    queryKey: ['insights', workspaceId, funnelId, funnelVersion, filter.dateFrom, filter.dateTo],
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

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

type DateFilterOption = {
  label: string
  value: 'today' | 'yesterday' | '7d' | '30d' | 'all'
  range: () => { dateFrom: string | undefined; dateTo: string | undefined }
}

const DATE_FILTER_OPTIONS: DateFilterOption[] = [
  {
    label: 'Today',
    value: 'today',
    range: () => {
      const today = formatLocalDate(new Date())
      return { dateFrom: today, dateTo: today }
    },
  },
  {
    label: 'Yesterday',
    value: 'yesterday',
    range: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const str = formatLocalDate(yesterday)
      return { dateFrom: str, dateTo: str }
    },
  },
  {
    label: 'Last 7 days',
    value: '7d',
    range: () => {
      const today = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 6)
      return { dateFrom: formatLocalDate(weekAgo), dateTo: formatLocalDate(today) }
    },
  },
  {
    label: 'Last 30 days',
    value: '30d',
    range: () => {
      const today = new Date()
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 29)
      return { dateFrom: formatLocalDate(monthAgo), dateTo: formatLocalDate(today) }
    },
  },
  {
    label: 'All time',
    value: 'all',
    range: () => ({ dateFrom: undefined, dateTo: undefined }),
  },
]

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel/insights')({
  validateSearch: (search) =>
    z
      .object({
        filter: z.enum(['today', 'yesterday', '7d', '30d', 'all']).optional(),
      })
      .parse(search),
  loaderDeps: ({ search }) => ({ filter: search.filter }),
  component: RouteComponent,
  ssr: false,
  loader: async ({ context, params, deps }) => {
    const publishedVersions = await context.queryClient.ensureQueryData(
      getPublishedVersionsQueryOptions(params.workspaceId, params.id),
    )
    const latestPublishedVersion = publishedVersions.at(-1)
    if (latestPublishedVersion) {
      const filterOption = DATE_FILTER_OPTIONS.find((o) => o.value === (deps.filter ?? 'today'))!
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
  filter: { dateFrom: string | undefined; dateTo: string | undefined }
}) {
  const insightsQuery = useSuspenseQuery(getInsightsQueryOptions(workspaceId, funnelId, funnelVersion, filter))
  const insights = insightsQuery.data
  const hasData = insights?.kpis?.total_views > 0

  const kpis = hasData
    ? [
        { label: 'Total Views', value: formatNumber(insights.kpis.total_views, true) },
        { label: 'Started', value: formatNumber(insights.kpis.total_starts, true) },
        { label: 'Start Rate', value: formatPercentage(insights.kpis.start_rate) },
        { label: 'Completions', value: formatNumber(insights.kpis.total_completions, true) },
        { label: 'Completion Rate', value: formatPercentage(insights.kpis.completion_rate) },
      ]
    : []

  return hasData ? (
    <div className="flex flex-col gap-2 rounded-3xl bg-muted p-2">
      <div className="grid grid-cols-5 gap-2">
        {kpis.map((kpi) => (
          <Card.Root key={kpi.label} size="sm">
            <Card.Header>
              <Card.Title className="text-muted-foreground">{kpi.label}</Card.Title>
              <Card.Description className="font-medium text-foreground">{kpi.value}</Card.Description>
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
                  <Table.Head className="w-[20%]">Page</Table.Head>
                  <Table.Head className="w-[20%] text-right">Views</Table.Head>
                  <Table.Head className="w-[20%] text-right">Exits</Table.Head>
                  <Table.Head className="w-[20%] text-right">Drop-off rate</Table.Head>
                  <Table.Head className="w-[20%] text-right">Avg time</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {insights.pages.map((page) => (
                  <Table.Row key={page.page_id} className="hover:bg-transparent">
                    <Table.Cell className="truncate">{page.page_name || page.page_id}</Table.Cell>
                    <Table.Cell className="text-right">{formatNumber(page.page_views)}</Table.Cell>
                    <Table.Cell className="text-right">{formatNumber(page.exits)}</Table.Cell>
                    <Table.Cell className="text-right">{formatPercentage(page.dropoff_rate)}</Table.Cell>
                    <Table.Cell className="text-right">{formatDuration(page.avg_duration)}</Table.Cell>
                  </Table.Row>
                ))}
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
                There's no traffic data for the selected time range. Try selecting a different period or share your
                funnel link to start collecting insights.
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

  const filter = search.filter ?? 'today'

  const handleFilterChange = (value: typeof filter) => {
    navigate({ search: { filter: value } })
  }

  const publishedVersionsQuery = useSuspenseQuery(getPublishedVersionsQueryOptions(params.workspaceId, params.id))
  const latestPublishedVersion = publishedVersionsQuery.data.at(-1)

  const filterOption = DATE_FILTER_OPTIONS.find((o) => o.value === filter)!
  const filterRange = filterOption.range()

  return (
    <div className="p-6 sm:pt-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">Insights</div>
          <Select.Root items={DATE_FILTER_OPTIONS} value={filter} onValueChange={handleFilterChange}>
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
            filter={filterRange}
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
