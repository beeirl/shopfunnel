import { DateRangePicker, type DateRangePickerValue } from '@/components/date-range-picker'
import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Table } from '@/components/ui/table'
import { withActor } from '@/context/auth.withActor'
import {
  formatNumber,
  formatPercentage,
  getAnalyticsFunnelKpisQueryOptions,
} from '@/routes/workspace/$workspaceId/-common'
import { Experiment } from '@shopfunnel/core/experiment/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { IconChartBar as ChartBarIcon } from '@tabler/icons-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { Heading } from '../../../-components/heading'

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

function formatCurrency(cents: number): string {
  const dollars = cents / 100
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

const getExperiment = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      experimentId: Identifier.schema('experiment'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Experiment.fromId(data.experimentId), data.workspaceId)
  })

export const Route = createFileRoute(
  '/workspace/$workspaceId/_dashboard/campaigns/$campaignId/experiments/$experimentId',
)({
  staticData: { title: 'Experiment' },
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

    const experiment = await getExperiment({
      data: { workspaceId: params.workspaceId, experimentId: params.experimentId },
    })

    if (experiment) {
      await context.queryClient.ensureQueryData(
        getAnalyticsFunnelKpisQueryOptions(params.workspaceId, undefined, filter, params.experimentId),
      )
    }

    return { experiment }
  },
})

function RouteComponent() {
  const params = Route.useParams()
  const navigate = useNavigate({ from: Route.fullPath })
  const deps = Route.useLoaderDeps()
  const { experiment } = Route.useLoaderData()

  const filter = React.useMemo(
    () => ({ startDate: deps.startDate, endDate: deps.endDate }),
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

  const funnelKpisQuery = useSuspenseQuery(
    getAnalyticsFunnelKpisQueryOptions(params.workspaceId, undefined, filter, params.experimentId),
  )
  const funnelKpis = funnelKpisQuery.data

  const variantMap = React.useMemo(() => {
    if (!experiment) return new Map<string, { funnelTitle: string; isControl: boolean; weight: number }>()
    return new Map(
      experiment.variants.map((v) => [
        v.funnelId,
        { funnelTitle: v.funnelTitle, isControl: v.isControl, weight: v.weight },
      ]),
    )
  }, [experiment])

  const funnelRows = React.useMemo(() => {
    return funnelKpis
      .map((fk) => {
        const variant = variantMap.get(fk.funnel_id)
        return {
          ...fk,
          title: variant?.funnelTitle ?? fk.funnel_id,
          isControl: variant?.isControl ?? false,
          weight: variant?.weight ?? 0,
        }
      })
      .sort((a, b) => {
        if (a.isControl !== b.isControl) return a.isControl ? -1 : 1
        return b.total_visitors - a.total_visitors
      })
  }, [funnelKpis, variantMap])

  const hasData = funnelRows.some((r) => r.total_visitors > 0)

  return (
    <div className="flex h-full w-full max-w-4xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>{experiment?.name ?? 'Experiment Analytics'}</Heading.Title>
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
                    No traffic was recorded for this experiment in the selected time range. Try selecting a different
                    period.
                  </Empty.Description>
                </Empty.Header>
              </Empty.Root>
            </Card.Content>
          </Card.Root>
        ) : (
          <Card.Root size="sm">
            <Card.Content className="-mx-0.5 -mt-2.5 -mb-2">
              <Table.Root>
                <Table.Header>
                  <Table.Row className="hover:bg-transparent">
                    <Table.Head className="w-full">Variant</Table.Head>
                    <Table.Head className="text-right">Visits</Table.Head>
                    <Table.Head className="text-right">Orders</Table.Head>
                    <Table.Head className="text-right">Start Rate</Table.Head>
                    <Table.Head className="text-right">Completion Rate</Table.Head>
                    <Table.Head className="text-right">Conversion Rate</Table.Head>
                    <Table.Head className="text-right">Revenue per Visitor</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {funnelRows.map((row) => (
                    <Table.Row key={row.funnel_id} className="hover:bg-transparent">
                      <Table.Cell className="max-w-0 truncate font-medium">
                        <Link
                          className="hover:underline"
                          to="/workspace/$workspaceId/funnels/$id/insights"
                          params={{ workspaceId: params.workspaceId, id: row.funnel_id }}
                        >
                          {row.title}
                        </Link>
                        {row.isControl && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Control
                          </span>
                        )}
                      </Table.Cell>
                      <Table.Cell className="text-right">{formatNumber(row.total_visitors, true)}</Table.Cell>
                      <Table.Cell className="text-right">{formatNumber(row.total_orders, true)}</Table.Cell>
                      <Table.Cell className="text-right">{formatPercentage(Math.min(row.start_rate, 100))}</Table.Cell>
                      <Table.Cell className="text-right whitespace-nowrap">
                        {formatPercentage(Math.min(row.completion_rate, 100))}
                        <span className="text-muted-foreground">{` (${formatPercentage(Math.min(row.total_starts > 0 ? (row.total_completions / row.total_starts) * 100 : 0, 100))})`}</span>
                      </Table.Cell>
                      <Table.Cell className="text-right whitespace-nowrap">
                        {formatPercentage(Math.min(row.conversion_rate, 100))}
                        <span className="text-muted-foreground">{` (${formatPercentage(Math.min(row.total_starts > 0 ? (row.total_orders / row.total_starts) * 100 : 0, 100))})`}</span>
                      </Table.Cell>
                      <Table.Cell className="text-right">{formatCurrency(row.revenue_per_visitor)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Card.Content>
          </Card.Root>
        )}
      </div>
    </div>
  )
}
