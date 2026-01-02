import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Submission } from '@shopfunnel/core/submission/index'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { Column, useTable } from 'react-table'
import { z } from 'zod'

import { Table } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const listSubmissions = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      quizId: Identifier.schema('quiz'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Submission.list(data.quizId), data.workspaceId)
  })

const listSubmissionsQueryOptions = (workspaceId: string, quizId: string) =>
  queryOptions({
    queryKey: ['submissions', workspaceId, quizId],
    queryFn: () => listSubmissions({ data: { workspaceId, quizId } }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/quizzes/$id/_layout/responses')({
  component: RouteComponent,
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

function RouteComponent() {
  const params = Route.useParams()
  const { data } = useSuspenseQuery(listSubmissionsQueryOptions(params.workspaceId, params.id))

  const columns: Column<RowData>[] = React.useMemo(() => {
    const questionColumns: Column<RowData>[] = data.questions
      .sort((a, b) => a.index - b.index)
      .map((q) => ({
        Header: q.title,
        accessor: q.id,
      }))

    return [{ Header: 'Submitted At', accessor: 'submittedAt' }, ...questionColumns]
  }, [data.questions])

  const tableData: RowData[] = React.useMemo(() => {
    return data.submissions.map((submission) => {
      const row: RowData = {
        submittedAt: formatDate(new Date(submission.completedAt ?? submission.createdAt)),
      }
      for (const question of data.questions) {
        const answers = submission.answers[question.id]
        row[question.id] = answers?.join(', ') ?? ''
      }
      return row
    })
  }, [data.submissions, data.questions])

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({
    columns,
    data: tableData,
  })

  return (
    <div className="flex flex-1 overflow-auto p-6">
      <div className="w-full space-y-6">
        <div className="text-2xl font-bold">Responses</div>
        <div className="overflow-x-auto rounded-lg border">
          <Table.Root {...getTableProps()} className="min-w-max">
            <Table.Header>
              {headerGroups.map((headerGroup) => {
                const { key: headerGroupKey, ...headerGroupProps } = headerGroup.getHeaderGroupProps()
                return (
                  <Table.Row key={headerGroupKey} className="bg-muted" {...headerGroupProps}>
                    {headerGroup.headers.map((column, index) => {
                      const { key: columnKey, ...columnProps } = column.getHeaderProps()
                      const isFirstColumn = index === 0
                      const isLastColumn = index === headerGroup.headers.length - 1
                      return (
                        <Table.Head
                          key={columnKey}
                          className={cn('min-w-56 p-0', isFirstColumn && 'sticky left-0 bg-muted')}
                          {...columnProps}
                        >
                          <div
                            className={cn(
                              'flex h-full items-center px-2 py-2',
                              !isLastColumn && 'border-r border-border',
                            )}
                            style={isFirstColumn ? { boxShadow: 'rgba(89, 86, 93, 0.04) 2px 0px 0px' } : undefined}
                          >
                            {column.render('Header')}
                          </div>
                        </Table.Head>
                      )
                    })}
                  </Table.Row>
                )
              })}
            </Table.Header>
            <Table.Body {...getTableBodyProps()}>
              {rows.map((row) => {
                prepareRow(row)
                const { key: rowKey, ...rowProps } = row.getRowProps()
                return (
                  <Table.Row key={rowKey} {...rowProps}>
                    {row.cells.map((cell, index) => {
                      const { key: cellKey, ...cellProps } = cell.getCellProps()
                      const isFirstColumn = index === 0
                      const isLastColumn = index === row.cells.length - 1
                      return (
                        <Table.Cell
                          key={cellKey}
                          className={cn('min-w-56 p-0', isFirstColumn && 'sticky left-0 bg-background')}
                          {...cellProps}
                        >
                          <div
                            className={cn('flex items-center p-2', !isLastColumn && 'border-r border-border')}
                            style={isFirstColumn ? { boxShadow: 'rgba(89, 86, 93, 0.04) 2px 0px 0px' } : undefined}
                          >
                            {cell.render('Cell')}
                          </div>
                        </Table.Cell>
                      )
                    })}
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Root>
        </div>
      </div>
    </div>
  )
}
