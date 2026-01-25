import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { withActor } from '@/context/auth.withActor'
import { cn } from '@/lib/utils'
import { Identifier } from '@shopfunnel/core/identifier'
import { Submission } from '@shopfunnel/core/submission/index'
import {
  IconChevronLeft as ChevronLeftIcon,
  IconChevronRight as ChevronRightIcon,
  IconInbox as InboxIcon,
} from '@tabler/icons-react'
import { keepPreviousData, queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import * as React from 'react'
import { z } from 'zod'

const listSubmissions = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      page: z.number().int().positive().default(1),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Submission.list({ funnelId: data.funnelId, page: data.page, limit: 50 }), data.workspaceId)
  })

const listSubmissionsQueryOptions = (workspaceId: string, funnelId: string, page: number = 1) =>
  queryOptions({
    queryKey: ['submissions', workspaceId, funnelId, page],
    queryFn: () => listSubmissions({ data: { workspaceId, funnelId, page } }),
    placeholderData: keepPreviousData,
  })

export const Route = createFileRoute('/_app/workspace/$workspaceId/funnels/$id/_funnel/responses')({
  validateSearch: (search) =>
    z
      .object({
        page: z.coerce.number().int().positive().optional(),
      })
      .parse(search),
  loaderDeps: ({ search }) => ({ page: search.page }),
  component: RouteComponent,
  ssr: false,
  loader: async ({ context, params, deps }) => {
    await context.queryClient.ensureQueryData(
      listSubmissionsQueryOptions(params.workspaceId, params.id, deps.page ?? 1),
    )
  },
})

type RowData = {
  submittedAt: string
  [questionId: string]: string
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const columnHelper = createColumnHelper<RowData>()

function RouteComponent() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const currentPage = search.page ?? 1

  const { data, isFetching } = useSuspenseQuery(listSubmissionsQueryOptions(params.workspaceId, params.id, currentPage))

  const goToPage = (newPage: number) => {
    navigate({ search: { page: newPage } })
  }

  const columns = React.useMemo(() => {
    const questionColumns = data.questions
      .sort((a, b) => a.index - b.index)
      .map((q) =>
        columnHelper.accessor(q.id, {
          header: q.title,
        }),
      )

    return [
      columnHelper.accessor('submittedAt', {
        header: 'Submitted at',
      }),
      ...questionColumns,
    ]
  }, [data.questions])

  const tableData: RowData[] = React.useMemo(() => {
    return data.submissions.map((submission) => {
      const row: RowData = {
        submittedAt: formatDate(new Date(submission.updatedAt)),
      }
      for (const question of data.questions) {
        const answers = submission.answers[question.id]
        row[question.id] = answers?.join(', ') ?? ''
      }
      return row
    })
  }, [data.submissions, data.questions])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const pages = () => {
    const { totalPages } = data
    const start = Math.max(1, currentPage - 5)
    const end = Math.min(totalPages, currentPage + 5)
    const pages: number[] = []
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  const hasMore = data.totalPages > 1
  const hasResponses = data.submissions.length > 0

  return (
    <div
      className={cn(
        'flex h-[calc(100vh-var(--dashboard-header-height))] flex-col gap-6 overflow-hidden py-6 sm:pt-10',
        hasMore && 'pb-0',
      )}
    >
      <div className="px-6 text-2xl font-bold sm:px-14">Responses</div>
      {!hasResponses ? (
        <div className="px-6 sm:px-14">
          <div className="rounded-3xl bg-muted p-2">
            <Card.Root>
              <Card.Content>
                <Empty.Root>
                  <Empty.Header>
                    <Empty.Media variant="icon">
                      <InboxIcon />
                    </Empty.Media>
                    <Empty.Title>No responses yet</Empty.Title>
                    <Empty.Description>
                      Responses will appear here once users start completing your funnel.
                    </Empty.Description>
                  </Empty.Header>
                </Empty.Root>
              </Card.Content>
            </Card.Root>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="no-scrollbar flex-1 overflow-auto px-6 sm:px-12">
            <table className="w-full min-w-max caption-bottom text-sm">
              <thead className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_var(--color-border)]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="transition-colors">
                    {headerGroup.headers.map((header, index) => {
                      const isFirstColumn = index === 0
                      return (
                        <th
                          key={header.id}
                          className={cn(
                            'h-10 p-0 text-left align-middle font-medium whitespace-nowrap text-muted-foreground',
                            isFirstColumn ? 'w-56' : 'min-w-56',
                          )}
                        >
                          <div className="flex h-full items-center px-2 py-2">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    {row.getVisibleCells().map((cell, index) => {
                      const isFirstColumn = index === 0
                      return (
                        <td
                          key={cell.id}
                          className={cn('p-0 align-middle whitespace-nowrap', isFirstColumn ? 'w-56' : 'min-w-56')}
                        >
                          <div className="flex items-center p-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="sticky bottom-0 flex items-center justify-between gap-4 bg-background px-6 py-1.5 sm:px-12">
              <div className="flex items-center gap-1">
                <Button
                  disabled={currentPage === 1 || isFetching}
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => goToPage(currentPage - 1)}
                >
                  <ChevronLeftIcon />
                </Button>
                {pages().map((page) => (
                  <Button
                    key={page}
                    className="tabular-nums"
                    disabled={isFetching}
                    size="sm"
                    variant={currentPage === page ? 'secondary' : 'ghost'}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  disabled={currentPage >= data.totalPages || isFetching}
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => goToPage(currentPage + 1)}
                >
                  <ChevronRightIcon />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">{data.total.toLocaleString('en-US')} results</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
