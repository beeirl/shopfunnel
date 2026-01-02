import { Card } from '@/components/ui/card'
import { Chart, ChartConfig } from '@/components/ui/chart'
import { Empty } from '@/components/ui/empty'
import { Resource } from '@shopfunnel/resource'
import { IconChartBar as ChartBarIcon } from '@tabler/icons-react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { z } from 'zod'

interface FunnelData {
  step_index: number
  step_id: string
  step_name: string
  views: number
  avg_duration_ms: number
}

interface MetricsData {
  total_views: number
  total_starts: number
  total_completions: number
}

const getInsights = createServerFn()
  .inputValidator(z.object({ quizId: z.string() }))
  .handler(async ({ data }) => {
    const token = Resource.TINYBIRD_TOKEN.value

    const [funnelRes, metricsRes] = await Promise.all([
      fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/funnel.json?quiz_id=${data.quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/quiz_metrics.json?quiz_id=${data.quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    const funnelJson = await funnelRes.json()
    const metricsJson = await metricsRes.json()

    const funnel: FunnelData[] = funnelJson.data ?? []
    const metrics: MetricsData = metricsJson.data?.[0] ?? {
      total_views: 0,
      total_starts: 0,
      total_completions: 0,
    }

    return { funnel, metrics }
  })

const getInsightsQueryOptions = (quizId: string) =>
  queryOptions({
    queryKey: ['insights', quizId],
    queryFn: () => getInsights({ data: { quizId } }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/quizzes/$id/_layout/insights')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getInsightsQueryOptions(params.id))
  },
})

const chartConfig = {
  views: {
    label: 'Views',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

function formatDuration(ms: number): string {
  if (!ms || ms === 0) return '0s'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

function RouteComponent() {
  const params = Route.useParams()
  const insightsQuery = useSuspenseQuery(getInsightsQueryOptions(params.id))
  const { funnel, metrics } = insightsQuery.data

  // Transform funnel data for chart
  const funnelData = funnel.map((item, index, arr) => {
    const prevViews = index > 0 ? arr[index - 1]!.views : item.views
    const dropoff = prevViews - item.views
    const dropoffPercent = prevViews > 0 ? Math.round((dropoff / prevViews) * 100) : 0

    return {
      step: `${item.step_index + 1}. ${item.step_name}`,
      views: item.views,
      dropoff,
      dropoffPercent,
      avgTime: formatDuration(item.avg_duration_ms),
    }
  })

  // Calculate metrics
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

  const hasData = funnel.length > 0 || metrics.total_views > 0

  return (
    <div className="flex flex-1 justify-center overflow-auto p-6">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-2xl font-bold">Insights</div>

        {!hasData ? (
          <Empty.Root>
            <Empty.Header>
              <Empty.Media variant="icon">
                <ChartBarIcon />
              </Empty.Media>
              <Empty.Title>No data yet</Empty.Title>
              <Empty.Description>Analytics will appear here once visitors start taking your quiz.</Empty.Description>
            </Empty.Header>
          </Empty.Root>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-4">
              {metricsCards.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-border bg-card px-4 pt-3.5 pb-3">
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                  <div className="mt-1 text-2xl font-semibold">{metric.value}</div>
                </div>
              ))}
            </div>

            {funnelData.length > 0 && (
              <Card.Root>
                <Card.Header>
                  <Card.Title>Drop-off Funnel</Card.Title>
                </Card.Header>
                <Card.Content>
                  <Chart.Container config={chartConfig} className="aspect-2/1 w-full">
                    <BarChart data={funnelData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="step" tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        domain={[0, 'auto']}
                        tickFormatter={(value) => `${value.toLocaleString()}`}
                        width={50}
                      />
                      <Chart.Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const data = payload[0].payload
                          return (
                            <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg">
                              <div className="font-semibold">{data.step}</div>
                              <div className="mt-1 space-y-0.5 text-sm">
                                <div className="text-muted-foreground">
                                  <span className="font-medium text-foreground">{data.views.toLocaleString()}</span>{' '}
                                  views
                                </div>
                                {data.dropoff > 0 && (
                                  <div className="text-muted-foreground">
                                    <span className="font-medium text-foreground">{data.dropoff.toLocaleString()}</span>{' '}
                                    ({data.dropoffPercent}%) dropoff
                                  </div>
                                )}
                                <div className="text-muted-foreground">
                                  Avg time: <span className="font-medium text-foreground">{data.avgTime}</span>
                                </div>
                              </div>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="views" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </Chart.Container>
                </Card.Content>
              </Card.Root>
            )}
          </>
        )}
      </div>
    </div>
  )
}
