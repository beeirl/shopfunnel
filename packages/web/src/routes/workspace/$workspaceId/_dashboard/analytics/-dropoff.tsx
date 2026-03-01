import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Table } from '@/components/ui/table'

import { Resource } from '@shopfunnel/resource'
import { IconChartBar as ChartBarIcon } from '@tabler/icons-react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { formatNumber, formatPercentage } from './-common'

function formatDuration(ms: number): string {
  if (ms <= 0) return '0:00 min'
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')} min`
}

type DropoffPage = {
  page_id: string
  page_name: string
  page_index: number
  page_views: number
  page_completions: number
  exits: number
  avg_duration: number
  dropoff_rate: number
}

const getAnalyticsDropoff = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: z.string(),
      funnelId: z.string(),
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
      funnel_id: data.funnelId,
      start_date: data.filter.startDate,
      end_date: data.filter.endDate,
    })

    const response = await fetch(`https://api.us-east.aws.tinybird.co/v0/pipes/analytics_dropoff.json?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = (await response.json()) as { data: DropoffPage[] }
    return json.data ?? []
  })

export const getAnalyticsDropoffQueryOptions = (
  workspaceId: string,
  funnelId: string,
  filter: { startDate: string; endDate: string },
) =>
  queryOptions({
    queryKey: ['analytics-dropoff', workspaceId, funnelId, filter.startDate, filter.endDate],
    queryFn: () => getAnalyticsDropoff({ data: { workspaceId, funnelId, filter } }),
  })

function DropoffTable({
  workspaceId,
  funnelId,
  filter,
}: {
  workspaceId: string
  funnelId: string
  filter: { startDate: string; endDate: string }
}) {
  const dropoffQuery = useSuspenseQuery(getAnalyticsDropoffQueryOptions(workspaceId, funnelId, filter))
  const pages = dropoffQuery.data

  if (pages.length === 0) {
    return (
      <Card.Root>
        <Card.Content>
          <Empty.Root>
            <Empty.Header>
              <Empty.Media variant="icon">
                <ChartBarIcon />
              </Empty.Media>
              <Empty.Title>No data for this period</Empty.Title>
              <Empty.Description>
                No page-level data was recorded for this funnel. Try selecting a different period.
              </Empty.Description>
            </Empty.Header>
          </Empty.Root>
        </Card.Content>
      </Card.Root>
    )
  }

  return (
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
            {pages.map((page) => {
              const isExternal = page.page_id === 'external'
              return (
                <Table.Row key={page.page_id} className="hover:bg-transparent">
                  <Table.Cell className="truncate">{page.page_name || page.page_id}</Table.Cell>
                  <Table.Cell className="text-right">{formatNumber(page.page_views)}</Table.Cell>
                  <Table.Cell className="text-right">{isExternal ? '-' : formatNumber(page.exits)}</Table.Cell>
                  <Table.Cell className="text-right">
                    {isExternal ? '-' : formatPercentage(page.dropoff_rate)}
                  </Table.Cell>
                  <Table.Cell className="text-right">{isExternal ? '-' : formatDuration(page.avg_duration)}</Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  )
}

type DropoffTabProps = {
  workspaceId: string
  funnelId: string | undefined
  funnels: { id: string; title: string }[]
  filter: { startDate: string; endDate: string }
}

export function DropoffTab({ workspaceId, funnelId, funnels, filter }: DropoffTabProps) {
  const selectedFunnelId = funnelId ?? funnels[0]?.id

  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-muted p-2">
      {!selectedFunnelId ? (
        <Card.Root>
          <Card.Content>
            <Empty.Root>
              <Empty.Header>
                <Empty.Media variant="icon">
                  <ChartBarIcon />
                </Empty.Media>
                <Empty.Title>No funnels</Empty.Title>
                <Empty.Description>Create a funnel to see page-level drop-off analysis.</Empty.Description>
              </Empty.Header>
            </Empty.Root>
          </Card.Content>
        </Card.Root>
      ) : (
        <DropoffTable workspaceId={workspaceId} funnelId={selectedFunnelId} filter={filter} />
      )}
    </div>
  )
}
