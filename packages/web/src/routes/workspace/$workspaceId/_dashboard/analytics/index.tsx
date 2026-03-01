import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { Heading } from '../-components/heading'
import { AnalyticsSearch, formatDateForSearch, listFunnelsQueryOptions, resolveAnalyticsSearch } from './-common'
import { DateRangePicker, type DateRangePickerValue } from './-date-range-picker'
import { DropoffTab, getAnalyticsDropoffQueryOptions } from './-dropoff'
import {
  GeneralTab,
  computeGranularity,
  getAnalyticsKpisQueryOptions,
  getAnalyticsTimeseriesQueryOptions,
} from './-general'

type Tab = 'general' | 'dropoff'

const tabLinkBase = [
  'relative inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-xm font-medium whitespace-nowrap transition-all cursor-pointer',
  'text-foreground/60 hover:text-foreground',
  'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground after:opacity-0 after:transition-opacity',
].join(' ')

const tabLinkActive = 'text-foreground after:opacity-100'

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard/analytics/')({
  staticData: { title: 'Analytics' },
  component: RouteComponent,
  validateSearch: AnalyticsSearch,
  loaderDeps: ({ search }) => {
    const resolved = resolveAnalyticsSearch(search)
    return {
      period: resolved.period,
      startDate: resolved.from.toISOString(),
      endDate: resolved.to.toISOString(),
    }
  },
  loader: async ({ context, params, deps }) => {
    const filter = { startDate: deps.startDate, endDate: deps.endDate }
    const granularity = computeGranularity(new Date(deps.startDate), new Date(deps.endDate))

    const funnelsData = await context.queryClient.ensureQueryData(listFunnelsQueryOptions(params.workspaceId))

    const promises: Promise<unknown>[] = [
      // General tab data (all funnels)
      context.queryClient.ensureQueryData(getAnalyticsKpisQueryOptions(params.workspaceId, undefined, filter)),
      context.queryClient.ensureQueryData(
        getAnalyticsTimeseriesQueryOptions(params.workspaceId, undefined, filter, granularity),
      ),
    ]

    // Dropoff tab data (first funnel, if one exists)
    const firstFunnelId = funnelsData[0]?.id
    if (firstFunnelId) {
      promises.push(
        context.queryClient.ensureQueryData(getAnalyticsDropoffQueryOptions(params.workspaceId, firstFunnelId, filter)),
      )
    }

    await Promise.all(promises)
  },
})

function RouteComponent() {
  const params = Route.useParams()
  const navigate = useNavigate({ from: Route.fullPath })
  const deps = Route.useLoaderDeps()

  const search = Route.useSearch()
  const activeTab: Tab = search.tab === 'dropoff' ? 'dropoff' : 'general'
  const [funnelId, setFunnelId] = React.useState<string | undefined>(undefined)

  const funnelsQuery = useSuspenseQuery(listFunnelsQueryOptions(params.workspaceId))
  const funnels = funnelsQuery.data ?? []

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

  const handleFunnelChange = React.useCallback((value: string | null) => {
    setFunnelId(value === 'all' ? undefined : (value ?? undefined))
  }, [])

  const filter = React.useMemo(
    () => ({ startDate: deps.startDate, endDate: deps.endDate }),
    [deps.startDate, deps.endDate],
  )

  // For the dropoff tab, resolve the effective funnel ID (fall back to first funnel)
  const dropoffFunnelId = funnelId ?? funnels[0]?.id

  return (
    <div className="flex h-full w-full max-w-4xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Analytics</Heading.Title>
        </Heading.Content>
      </Heading.Root>

      <div className="flex flex-col">
        <div className="flex gap-1 border-b border-border">
          <button
            type="button"
            onClick={() => navigate({ search: (prev) => ({ ...prev, tab: undefined }) })}
            className={cn(tabLinkBase, activeTab === 'general' && tabLinkActive)}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => navigate({ search: (prev) => ({ ...prev, tab: 'dropoff' as const }) })}
            className={cn(tabLinkBase, activeTab === 'dropoff' && tabLinkActive)}
          >
            Drop-off
          </button>
        </div>

        <div className="flex flex-col gap-4 pt-4">
          <div className="flex items-center gap-2">
            <DateRangePicker value={dateRange} onValueChange={handleDateRangeChange} size="sm" align="start" />
            {activeTab === 'general' ? (
              <Select.Root
                value={funnelId ?? 'all'}
                onValueChange={handleFunnelChange}
                items={[
                  { value: 'all', label: 'All funnels' },
                  ...funnels.map((f) => ({ value: f.id, label: f.title })),
                ]}
              >
                <Select.Trigger size="sm">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content align="start" alignItemWithTrigger={false}>
                  <Select.Group>
                    <Select.Item value="all">All funnels</Select.Item>
                    {funnels.map((funnel) => (
                      <Select.Item key={funnel.id} value={funnel.id}>
                        {funnel.title}
                      </Select.Item>
                    ))}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            ) : (
              <Select.Root
                value={dropoffFunnelId ?? ''}
                onValueChange={(v) => setFunnelId(v ?? undefined)}
                items={funnels.map((f) => ({ value: f.id, label: f.title }))}
              >
                <Select.Trigger size="sm">
                  <Select.Value placeholder="Select a funnel" />
                </Select.Trigger>
                <Select.Content align="start" alignItemWithTrigger={false}>
                  <Select.Group>
                    {funnels.map((funnel) => (
                      <Select.Item key={funnel.id} value={funnel.id}>
                        {funnel.title}
                      </Select.Item>
                    ))}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            )}
          </div>

          {activeTab === 'general' ? (
            <GeneralTab workspaceId={params.workspaceId} funnelId={funnelId} filter={filter} />
          ) : (
            <DropoffTab workspaceId={params.workspaceId} funnelId={dropoffFunnelId} funnels={funnels} filter={filter} />
          )}
        </div>
      </div>
    </div>
  )
}
