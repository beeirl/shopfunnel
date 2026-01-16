import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
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
  .inputValidator(z.object({ workspaceId: z.string(), funnelId: z.string(), funnelVersion: z.number() }))
  .handler(async ({ data }) => {
    const token = Resource.TINYBIRD_TOKEN.value
    const baseParams = `workspace_id=${data.workspaceId}&funnel_id=${data.funnelId}&funnel_version=${data.funnelVersion}`

    const [kpisResponse, pagesResponse] = await Promise.all([
      fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/kpis.json?${baseParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/pages.json?${baseParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    const kpisJson = (await kpisResponse.json()) as any
    const pagesJson = (await pagesResponse.json()) as any

    return { kpis: kpisJson.data?.[0], pages: pagesJson.data }
  })

const getInsightsQueryOptions = (workspaceId: string, funnelId: string, funnelVersion: number | null) =>
  queryOptions({
    queryKey: ['insights', workspaceId, funnelId, funnelVersion],
    queryFn: () => getInsights({ data: { workspaceId, funnelId, funnelVersion: funnelVersion! } }),
    enabled: funnelVersion !== null,
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

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel/insights')({
  component: RouteComponent,
  ssr: false,
  loader: async ({ context, params }) => {
    const publishedVersions = await context.queryClient.ensureQueryData(
      getPublishedVersionsQueryOptions(params.workspaceId, params.id),
    )
    const latestPublishedVersion = publishedVersions.at(-1)
    if (latestPublishedVersion) {
      await context.queryClient.ensureQueryData(
        getInsightsQueryOptions(params.workspaceId, params.id, latestPublishedVersion),
      )
    }
  },
})

function Insights({
  workspaceId,
  funnelId,
  funnelVersion,
}: {
  workspaceId: string
  funnelId: string
  funnelVersion: number
}) {
  const insightsQuery = useSuspenseQuery(getInsightsQueryOptions(workspaceId, funnelId, funnelVersion))
  const insights = insightsQuery.data

  if (!insights.kpis || insights.kpis.total_views === 0) {
    return (
      <div className="rounded-3xl bg-muted p-2">
        <Card.Root>
          <Card.Content>
            <Empty.Root>
              <Empty.Header>
                <Empty.Media variant="icon">
                  <ChartBarIcon />
                </Empty.Media>
                <Empty.Title>No data yet</Empty.Title>
                <Empty.Description>
                  Your funnel is live but hasn't received any traffic yet. Share your funnel link to start collecting
                  insights.
                </Empty.Description>
              </Empty.Header>
            </Empty.Root>
          </Card.Content>
        </Card.Root>
      </div>
    )
  }

  const kpis = [
    { label: 'Total Views', value: formatNumber(insights.kpis.total_views, true) },
    { label: 'Started', value: formatNumber(insights.kpis.total_starts, true) },
    { label: 'Start Rate', value: formatPercentage(insights.kpis.start_rate) },
    { label: 'Completions', value: formatNumber(insights.kpis.total_completions, true) },
    { label: 'Completion Rate', value: formatPercentage(insights.kpis.completion_rate) },
  ]

  return (
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
                  <Table.Head>Page</Table.Head>
                  <Table.Head className="text-right">Views</Table.Head>
                  <Table.Head className="text-right">Exits</Table.Head>
                  <Table.Head className="text-right">Drop-off rate</Table.Head>
                  <Table.Head className="text-right">Avg time on page</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {insights.pages.map((page) => (
                  <Table.Row key={page.page_id} className="hover:bg-transparent">
                    <Table.Cell>{page.page_name || page.page_id}</Table.Cell>
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
  )
}

function RouteComponent() {
  const params = Route.useParams()

  const publishedVersionsQuery = useSuspenseQuery(getPublishedVersionsQueryOptions(params.workspaceId, params.id))
  const publishedVersions = publishedVersionsQuery.data
  const latestPublishedVersion = publishedVersions.at(-1)

  return (
    <div className="p-6 sm:pt-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="text-2xl font-bold">Insights</div>
        {!latestPublishedVersion ? (
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
        ) : (
          <Insights workspaceId={params.workspaceId} funnelId={params.id} funnelVersion={latestPublishedVersion} />
        )}
      </div>
    </div>
  )
}
