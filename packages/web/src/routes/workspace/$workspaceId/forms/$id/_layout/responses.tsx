import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { Column, useTable } from 'react-table'

import { Table } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/workspace/$workspaceId/forms/$id/_layout/responses')({
  component: RouteComponent,
})

type Submission = {
  responseTime: string
  gender: string
  age: string
  lifestyle: string
  goals: string
  activity: string
  diet: string
  plan: string
}

const mockSubmissions: Submission[] = [
  {
    responseTime: 'Dec 30, 2025 14:32',
    gender: 'Male',
    age: '25-34',
    lifestyle: 'Active',
    goals: 'Lose weight',
    activity: 'High',
    diet: 'Balanced',
    plan: 'Premium',
  },
  {
    responseTime: 'Dec 30, 2025 11:15',
    gender: 'Female',
    age: '18-24',
    lifestyle: 'Moderate',
    goals: 'Build muscle',
    activity: 'Medium',
    diet: 'Keto',
    plan: 'Basic',
  },
  {
    responseTime: 'Dec 29, 2025 18:47',
    gender: 'Male',
    age: '35-44',
    lifestyle: 'Sedentary',
    goals: 'Improve health',
    activity: 'Low',
    diet: 'Vegan',
    plan: 'Premium',
  },
  {
    responseTime: 'Dec 29, 2025 09:23',
    gender: 'Female',
    age: '45-54',
    lifestyle: 'Active',
    goals: 'Maintain weight',
    activity: 'High',
    diet: 'Mediterranean',
    plan: 'Pro',
  },
  {
    responseTime: 'Dec 28, 2025 16:58',
    gender: 'Non-binary',
    age: '25-34',
    lifestyle: 'Moderate',
    goals: 'Lose weight',
    activity: 'Medium',
    diet: 'Balanced',
    plan: 'Basic',
  },
  {
    responseTime: 'Dec 28, 2025 12:04',
    gender: 'Female',
    age: '18-24',
    lifestyle: 'Active',
    goals: 'Build muscle',
    activity: 'High',
    diet: 'High protein',
    plan: 'Pro',
  },
  {
    responseTime: 'Dec 27, 2025 20:31',
    gender: 'Male',
    age: '55-64',
    lifestyle: 'Sedentary',
    goals: 'Improve health',
    activity: 'Low',
    diet: 'Low carb',
    plan: 'Premium',
  },
  {
    responseTime: 'Dec 27, 2025 08:19',
    gender: 'Male',
    age: '35-44',
    lifestyle: 'Moderate',
    goals: 'Lose weight',
    activity: 'Medium',
    diet: 'Balanced',
    plan: 'Basic',
  },
]

function RouteComponent() {
  const columns: Column<Submission>[] = React.useMemo(
    () => [
      { Header: 'Submitted At', accessor: 'responseTime' },
      { Header: 'Gender', accessor: 'gender' },
      { Header: 'Age', accessor: 'age' },
      { Header: 'Lifestyle', accessor: 'lifestyle' },
      { Header: 'Goals', accessor: 'goals' },
      { Header: 'Activity', accessor: 'activity' },
      { Header: 'Diet', accessor: 'diet' },
      { Header: 'Plan', accessor: 'plan' },
    ],
    [],
  )

  const data = React.useMemo(() => mockSubmissions, [])

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({
    columns,
    data,
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
