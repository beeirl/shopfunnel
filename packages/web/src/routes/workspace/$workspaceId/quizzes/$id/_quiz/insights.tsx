import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Quiz } from '@shopfunnel/core/quiz/index'
import { Resource } from '@shopfunnel/resource'
import { IconChartBar as ChartBarIcon } from '@tabler/icons-react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip } from 'recharts'
import { z } from 'zod'

interface FunnelData {
  page_depth: number
  page_id: string
  page_name: string
  from_page_id: string | null
  views: number
  avg_duration_ms: number
}

interface MetricsData {
  total_views: number
  total_starts: number
  total_completions: number
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

    const [funnelRes, metricsRes] = await Promise.all([
      fetch(
        `https://api.us-east.aws.tinybird.co/v0/pipes/funnel.json?quiz_id=${data.quizId}&quiz_version=${data.quizVersion}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
      fetch(
        `https://api.us-east.aws.tinybird.co/v0/pipes/quiz_metrics.json?quiz_id=${data.quizId}&quiz_version=${data.quizVersion}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
    ])

    const funnelJson = (await funnelRes.json()) as any
    const metricsJson = (await metricsRes.json()) as any

    const funnel: FunnelData[] = funnelJson.data ?? []
    const metrics: MetricsData = metricsJson.data?.[0] ?? {
      total_views: 0,
      total_starts: 0,
      total_completions: 0,
    }

    return { funnel, metrics }
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

function formatDuration(ms: number): string {
  if (!ms || ms === 0) return '0s'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

interface SankeyNode {
  name: string
  pageId: string
  pageName: string
  depth: number
  views: number
  avgDuration: number
}

interface SankeyLink {
  source: number
  target: number
  value: number
}

function transformToSankeyData(funnelData: FunnelData[]): { nodes: SankeyNode[]; links: SankeyLink[] } {
  // Create a map of page_id to node index
  const nodeMap = new Map<string, number>()
  const nodes: SankeyNode[] = []
  const links: SankeyLink[] = []

  // First pass: create nodes for each unique page
  const pageDataMap = new Map<string, FunnelData>()

  // Aggregate views per page (sum across all from_page_id sources)
  for (const item of funnelData) {
    const existing = pageDataMap.get(item.page_id)
    if (existing) {
      // Aggregate views from different sources
      pageDataMap.set(item.page_id, {
        ...existing,
        views: existing.views + item.views,
        avg_duration_ms: (existing.avg_duration_ms + item.avg_duration_ms) / 2,
      })
    } else {
      pageDataMap.set(item.page_id, item)
    }
  }

  // Create nodes from aggregated data
  for (const [pageId, item] of pageDataMap) {
    nodeMap.set(pageId, nodes.length)
    nodes.push({
      name: item.page_name,
      pageId: pageId,
      pageName: item.page_name,
      depth: item.page_depth,
      views: item.views,
      avgDuration: item.avg_duration_ms,
    })
  }

  // Second pass: create links based on from_page_id relationships
  for (const item of funnelData) {
    if (item.from_page_id && nodeMap.has(item.from_page_id) && nodeMap.has(item.page_id)) {
      const sourceIndex = nodeMap.get(item.from_page_id)!
      const targetIndex = nodeMap.get(item.page_id)!
      links.push({
        source: sourceIndex,
        target: targetIndex,
        value: item.views,
      })
    }
  }

  return { nodes, links }
}

// Custom node component for Sankey diagram
function CustomNode(props: any) {
  const { x, y, width, height, payload } = props

  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill="var(--chart-1)" radius={[4, 4, 4, 4]} />
      <text x={x + width + 8} y={y + height / 2} textAnchor="start" dominantBaseline="middle" className="text-xs">
        {payload.pageName}
      </text>
      <text
        x={x + width / 2}
        y={y - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-xs font-semibold"
        fill="var(--foreground)"
      >
        {payload.views?.toLocaleString()}
      </text>
    </Layer>
  )
}

// Custom link component for Sankey diagram - draws straight dotted lines
function CustomLink(props: any) {
  const { sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, payload } = props

  // Calculate center points for source and target
  const sourceYCenter = sourceY + linkWidth / 2
  const targetYCenter = targetY + linkWidth / 2

  return (
    <Layer>
      <path
        d={`M${sourceX},${sourceYCenter} C${sourceControlX},${sourceYCenter} ${targetControlX},${targetYCenter} ${targetX},${targetYCenter}`}
        fill="none"
        stroke="var(--border)"
        strokeWidth={Math.max(1, linkWidth * 0.5)}
        strokeOpacity={0.6}
        strokeDasharray="4 2"
      />
    </Layer>
  )
}

// Custom tooltip for Sankey
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  // Handle node tooltip
  if (data.pageName) {
    return (
      <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg">
        <div className="font-semibold">{data.pageName}</div>
        <div className="mt-1 space-y-0.5 text-sm">
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">{data.views?.toLocaleString()}</span> views
          </div>
          <div className="text-muted-foreground">
            Avg time: <span className="font-medium text-foreground">{formatDuration(data.avgDuration)}</span>
          </div>
        </div>
      </div>
    )
  }

  // Handle link tooltip
  if (data.source && data.target) {
    return (
      <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg">
        <div className="font-semibold">
          {data.source.pageName} → {data.target.pageName}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{data.value?.toLocaleString()}</span> users
        </div>
      </div>
    )
  }

  return null
}

function BranchingFunnel({ funnelData }: { funnelData: FunnelData[] }) {
  const { nodes, links } = React.useMemo(() => transformToSankeyData(funnelData), [funnelData])

  if (nodes.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">No funnel data available yet</div>
    )
  }

  // If there are no links (single page or only first page data), show a simpler visualization
  if (links.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        {nodes.map((node) => (
          <div key={node.pageId} className="flex items-center gap-4">
            <div className="h-16 w-8 rounded bg-[var(--chart-1)]" />
            <div>
              <div className="font-medium">{node.pageName}</div>
              <div className="text-sm text-muted-foreground">{node.views.toLocaleString()} views</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <Sankey
        data={{ nodes, links }}
        nodeWidth={20}
        nodePadding={40}
        margin={{ top: 40, right: 160, bottom: 40, left: 40 }}
        link={<CustomLink />}
        node={<CustomNode />}
      >
        <Tooltip content={<CustomTooltip />} />
      </Sankey>
    </ResponsiveContainer>
  )
}

function Insights({ quizId, quizVersion }: { quizId: string; quizVersion: number }) {
  const insightsQuery = useSuspenseQuery(getInsightsQueryOptions(quizId, quizVersion))

  const funnel = insightsQuery.data?.funnel ?? []
  const metrics = insightsQuery.data?.metrics ?? {
    total_views: 0,
    total_starts: 0,
    total_completions: 0,
  }

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
      <Card.Root>
        <Card.Header>
          <Card.Title>Drop-off Funnel</Card.Title>
        </Card.Header>
        <Card.Content>
          <BranchingFunnel funnelData={funnel} />
        </Card.Content>
      </Card.Root>
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
