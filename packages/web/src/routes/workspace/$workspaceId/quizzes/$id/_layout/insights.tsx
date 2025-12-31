import { createFileRoute } from '@tanstack/react-router'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card } from '@/components/ui/card'
import { Chart, ChartConfig } from '@/components/ui/chart'

export const Route = createFileRoute('/workspace/$workspaceId/quizzes/$id/_layout/insights')({
  component: RouteComponent,
})

// Mock data for metric cards
const metrics = [
  { label: 'Total Visitors', value: '8,000' },
  { label: 'Revenue', value: '$2,450' },
  { label: 'Rev/Visitor', value: '$0.31' },
  { label: 'Paywall Rate', value: '42%' },
  { label: 'CVR', value: '3.2%' },
]

// Mock data for funnel chart
const funnelData = [
  { step: '1. Welcome', views: 8000, dropoff: 0, dropoffPercent: 0, avgTime: '12s' },
  { step: '2. Gender', views: 7500, dropoff: 500, dropoffPercent: 6, avgTime: '8s' },
  { step: '3. Age', views: 7200, dropoff: 300, dropoffPercent: 4, avgTime: '6s' },
  { step: '4. Lifestyle', views: 6900, dropoff: 300, dropoffPercent: 4, avgTime: '11s' },
  { step: '5. Goals', views: 6500, dropoff: 400, dropoffPercent: 6, avgTime: '15s' },
  { step: '6. Activity', views: 6100, dropoff: 400, dropoffPercent: 6, avgTime: '9s' },
  { step: '7. Diet', views: 5700, dropoff: 400, dropoffPercent: 7, avgTime: '14s' },
  { step: '8. Plan', views: 5200, dropoff: 500, dropoffPercent: 9, avgTime: '25s' },
  { step: '9. Paywall', views: 4600, dropoff: 600, dropoffPercent: 12, avgTime: '32s' },
]

const chartConfig = {
  views: {
    label: 'Views',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

function RouteComponent() {
  return (
    <div className="flex flex-1 justify-center overflow-auto p-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-2xl font-bold">Insights</div>
        <div className="grid grid-cols-5 gap-4">
          {metrics.map((metric) => (
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
            <Chart.Container config={chartConfig} className="aspect-2/1 w-full">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="step" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  domain={[3500, 'auto']}
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
                            <span className="font-medium text-foreground">{data.views.toLocaleString()}</span> views
                          </div>
                          {data.dropoff > 0 && (
                            <div className="text-muted-foreground">
                              <span className="font-medium text-foreground">{data.dropoff.toLocaleString()}</span> (
                              {data.dropoffPercent}%) dropoff
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
      </div>
    </div>
  )
}
