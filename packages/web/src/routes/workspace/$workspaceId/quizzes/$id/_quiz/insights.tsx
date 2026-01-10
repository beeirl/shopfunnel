import { Card } from '@/components/ui/card'
import { Chart } from '@/components/ui/chart'
import { Empty } from '@/components/ui/empty'
import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Quiz } from '@shopfunnel/core/quiz/index'
import { Resource } from '@shopfunnel/resource'
import { IconChartBar as ChartBarIcon } from '@tabler/icons-react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Sankey, Tooltip } from 'recharts'
import { z } from 'zod'

interface MetricsData {
  total_views: number
  total_starts: number
  total_completions: number
}

interface PathTransition {
  prev_page_id: string
  prev_page_name: string
  prev_page_index: number
  page_id: string
  page_name: string
  page_index: number
  transition_count: number
}

interface PageStats {
  page_id: string
  page_name: string
  page_index: number
  page_views: number
  page_completions: number
  avg_duration: number
}

interface SankeyNode {
  name: string
  pageId: string
  avgDuration?: number
  dropoffRate?: number
}

interface SankeyLink {
  source: number
  target: number
  value: number
}

interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

function transformPathsToSankey(paths: PathTransition[], pageStats: PageStats[]): SankeyData {
  if (paths.length === 0) {
    return { nodes: [], links: [] }
  }

  // Build stats lookup map
  const statsMap = new Map<string, PageStats>()
  pageStats.forEach((s) => {
    statsMap.set(s.page_id, s)
  })

  // Build nodes map with page index for ordering
  const nodeMap = new Map<string, { name: string; index: number }>()

  paths.forEach((p) => {
    if (!nodeMap.has(p.prev_page_id)) {
      nodeMap.set(p.prev_page_id, { name: p.prev_page_name || p.prev_page_id, index: p.prev_page_index })
    }
    if (!nodeMap.has(p.page_id)) {
      nodeMap.set(p.page_id, { name: p.page_name || p.page_id, index: p.page_index })
    }
  })

  // Sort nodes by page_index for proper left-to-right ordering
  const sortedNodes = [...nodeMap.entries()].sort((a, b) => a[1].index - b[1].index)

  const nodeIndexMap = new Map(sortedNodes.map(([id], i) => [id, i]))
  const nodes = sortedNodes.map(([pageId, { name }]) => {
    const stats = statsMap.get(pageId)
    const dropoffRate =
      stats && stats.page_views > 0
        ? Math.round(((stats.page_views - stats.page_completions) / stats.page_views) * 100)
        : undefined
    return {
      name,
      pageId,
      avgDuration: stats?.avg_duration,
      dropoffRate,
    }
  })

  const links = paths.map((p) => ({
    source: nodeIndexMap.get(p.prev_page_id)!,
    target: nodeIndexMap.get(p.page_id)!,
    value: p.transition_count,
  }))

  return { nodes, links }
}

const getPublishedVersionsQuery = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      quizId: Identifier.schema('quiz'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Quiz.getPublishedVersionNumbers(data.quizId), data.workspaceId)
  })

const getPublishedVersionsQueryOptions = (workspaceId: string, quizId: string) =>
  queryOptions({
    queryKey: ['quiz-published-version-numbers', workspaceId, quizId],
    queryFn: () => getPublishedVersionsQuery({ data: { workspaceId, quizId } }),
  })

const getInsights = createServerFn()
  .inputValidator(z.object({ quizId: z.string(), quizVersion: z.number() }))
  .handler(async ({ data }) => {
    const token = Resource.TINYBIRD_TOKEN.value

    const [metricsRes, pathsRes, pageStatsRes] = await Promise.all([
      fetch(
        `https://api.us-east.aws.tinybird.co/v0/pipes/quiz_metrics.json?quiz_id=${data.quizId}&quiz_version=${data.quizVersion}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
      fetch(
        `https://api.us-east.aws.tinybird.co/v0/pipes/quiz_paths.json?quiz_id=${data.quizId}&quiz_version=${data.quizVersion}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
      fetch(
        `https://api.us-east.aws.tinybird.co/v0/pipes/quiz_page_stats.json?quiz_id=${data.quizId}&quiz_version=${data.quizVersion}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
    ])

    const metricsJson = (await metricsRes.json()) as any
    const pathsJson = (await pathsRes.json()) as any
    const pageStatsJson = (await pageStatsRes.json()) as any
    console.log(pageStatsJson)

    const metrics: MetricsData = metricsJson.data?.[0] ?? {
      total_views: 0,
      total_starts: 0,
      total_completions: 0,
    }

    const paths: PathTransition[] = pathsJson.data ?? []
    const pageStats: PageStats[] = pageStatsJson.data ?? []

    return { metrics, paths, pageStats }
  })

const getInsightsQueryOptions = (quizId: string, quizVersion: number | null) =>
  queryOptions({
    queryKey: ['insights', quizId, quizVersion],
    queryFn: () => getInsights({ data: { quizId, quizVersion: quizVersion! } }),
    enabled: quizVersion !== null,
  })

export const Route = createFileRoute('/workspace/$workspaceId/quizzes/$id/_quiz/insights')({
  component: RouteComponent,
  ssr: false,
  loader: async ({ context, params }) => {
    const publishedVersions = await context.queryClient.ensureQueryData(
      getPublishedVersionsQueryOptions(params.workspaceId, params.id),
    )
    const latestPublishedVersion = publishedVersions.at(-1)
    if (latestPublishedVersion) {
      await context.queryClient.ensureQueryData(getInsightsQueryOptions(params.id, latestPublishedVersion))
    }
  },
})

const nodeColors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

function Insights({ quizId, quizVersion }: { quizId: string; quizVersion: number }) {
  const insightsQuery = useSuspenseQuery(getInsightsQueryOptions(quizId, quizVersion))

  const metrics = insightsQuery.data?.metrics ?? {
    total_views: 0,
    total_starts: 0,
    total_completions: 0,
  }

  const paths = insightsQuery.data?.paths ?? []
  const pageStats = insightsQuery.data?.pageStats ?? []
  const sankeyData = transformPathsToSankey(paths, pageStats)

  const startRate = metrics.total_views > 0 ? Math.round((metrics.total_starts / metrics.total_views) * 100) : 0
  const completionRate =
    metrics.total_starts > 0 ? Math.round((metrics.total_completions / metrics.total_starts) * 100) : 0

  const metricsCards = [
    { label: 'Total Views', value: metrics.total_views.toLocaleString() },
    { label: 'Started', value: metrics.total_starts.toLocaleString() },
    { label: 'Start Rate', value: `${startRate}%` },
    { label: 'Completions', value: metrics.total_completions.toLocaleString() },
    { label: 'Completion Rate', value: `${completionRate}%` },
  ]

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        {metricsCards.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-border bg-card px-4 pt-3.5 pb-3">
            <div className="text-sm text-muted-foreground">{metric.label}</div>
            <div className="mt-1 text-2xl font-semibold">{metric.value}</div>
          </div>
        ))}
      </div>

      {sankeyData.nodes.length > 0 && (
        <Card.Root>
          <Card.Header>
            <Card.Title>Quiz Paths</Card.Title>
          </Card.Header>
          <Card.Content>
            <Chart.Container config={{}} className="aspect-2/1 w-full">
              <Sankey
                data={sankeyData}
                nodeWidth={10}
                nodePadding={40}
                linkCurvature={0.5}
                iterations={64}
                node={(props) => {
                  const { x, y, width, height, index, payload } = props
                  // Check if this node has any outgoing links (is it a terminal node?)
                  const hasOutgoingLinks = sankeyData.links.some((link) => link.source === index)
                  const isTerminal = !hasOutgoingLinks

                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={nodeColors[index % nodeColors.length]}
                        fillOpacity={0.9}
                        rx={2}
                      />
                      <text
                        x={isTerminal ? x - 6 : x + width + 6}
                        y={y + height / 2}
                        textAnchor={isTerminal ? 'end' : 'start'}
                        dominantBaseline="middle"
                        className="fill-foreground text-xs"
                      >
                        {payload.name}
                      </text>
                    </g>
                  )
                }}
                link={(props) => {
                  const { sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth } = props
                  return (
                    <path
                      d={`
                        M${sourceX},${sourceY}
                        C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
                      `}
                      fill="none"
                      stroke="var(--chart-1)"
                      strokeOpacity={0.3}
                      strokeWidth={Math.max(linkWidth, 1)}
                    />
                  )
                }}
              >
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0]?.payload
                    if (!data) return null

                    // Check if it's a link or node
                    if (data.source !== undefined && data.target !== undefined) {
                      // Link tooltip
                      const sourceName = sankeyData.nodes[data.source]?.name ?? 'Unknown'
                      const targetName = sankeyData.nodes[data.target]?.name ?? 'Unknown'
                      return (
                        <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg">
                          <div className="text-sm">
                            <span className="font-medium">{sourceName}</span>
                            <span className="text-muted-foreground"> → </span>
                            <span className="font-medium">{targetName}</span>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{data.value?.toLocaleString()}</span> sessions
                          </div>
                        </div>
                      )
                    }

                    // Node tooltip - look up node from sankeyData to get avgDuration
                    const node = sankeyData.nodes.find((n) => n.name === data.name)
                    return (
                      <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg">
                        <div className="font-medium">{data.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{data.value?.toLocaleString()}</span> sessions
                        </div>
                        {node?.avgDuration != null && node.avgDuration > 0 && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{Math.round(node.avgDuration / 1000)}s</span>{' '}
                            avg time
                          </div>
                        )}
                        {node?.dropoffRate != null && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{node.dropoffRate}%</span> dropoff
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
              </Sankey>
            </Chart.Container>
          </Card.Content>
        </Card.Root>
      )}
    </>
  )
}

function RouteComponent() {
  const params = Route.useParams()

  const publishedVersionsQuery = useSuspenseQuery(getPublishedVersionsQueryOptions(params.workspaceId, params.id))
  const publishedVersions = publishedVersionsQuery.data
  const latestPublishedVersion = publishedVersions.at(-1)

  return (
    <div className="flex flex-1 justify-center overflow-auto px-6 pt-6 sm:pt-10">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <div className="text-2xl font-bold">Insights</div>
        {!latestPublishedVersion ? (
          <Card.Root>
            <Card.Content>
              <Empty.Root>
                <Empty.Header>
                  <Empty.Media variant="icon">
                    <ChartBarIcon />
                  </Empty.Media>
                  <Empty.Title>No insights available yet</Empty.Title>
                  <Empty.Description>
                    Publish your quiz to start collecting data. You'll see views, completion rates, and drop-off
                    analysis here.
                  </Empty.Description>
                </Empty.Header>
              </Empty.Root>
            </Card.Content>
          </Card.Root>
        ) : (
          <Insights quizId={params.id} quizVersion={latestPublishedVersion} />
        )}
      </div>
    </div>
  )
}
