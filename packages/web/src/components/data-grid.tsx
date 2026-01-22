import { cn } from '@/lib/utils'
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import * as React from 'react'

function DataGridRoot({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="data-grid" className={cn('grid gap-x-2 md:gap-x-8', className)} {...props} />
}

function DataGridHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="data-grid-header"
      className={cn('col-span-full grid grid-cols-subgrid items-center border-b border-border py-2', className)}
      {...props}
    />
  )
}

function DataGridHead({
  className,
  hideOnMobile,
  srOnly,
  ...props
}: React.ComponentProps<'span'> & {
  hideOnMobile?: boolean
  srOnly?: boolean
}) {
  return (
    <span
      data-slot="data-grid-head"
      className={cn(
        'text-sm font-medium text-muted-foreground',
        hideOnMobile && 'hidden md:block',
        srOnly && 'sr-only',
        className,
      )}
      {...props}
    />
  )
}

function DataGridBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="data-grid-body" className={cn('col-span-full grid grid-cols-subgrid', className)} {...props} />
}

function DataGridRow({ className, render, ...props }: useRender.ComponentProps<'div'>) {
  return (
    <div
      data-slot="data-grid-row"
      className={cn('col-span-full grid grid-cols-subgrid border-b border-border py-1', className)}
    >
      {useRender({
        defaultTagName: 'div',
        props: mergeProps<'div'>(
          {
            className:
              'col-span-full grid grid-cols-subgrid items-center rounded-lg px-0 py-1.5 hover:bg-muted/50 min-h-11 md:pl-3 md:pr-1',
          },
          props,
        ),
        render,
        state: { slot: 'data-grid-row-content' },
      })}
    </div>
  )
}

function DataGridCell({
  className,
  hideOnMobile,
  hideOnDesktop,
  ...props
}: React.ComponentProps<'div'> & {
  hideOnMobile?: boolean
  hideOnDesktop?: boolean
}) {
  return (
    <div
      data-slot="data-grid-cell"
      className={cn(
        'flex min-w-0 items-center',
        hideOnMobile && 'hidden md:flex',
        hideOnDesktop && 'md:hidden',
        className,
      )}
      {...props}
    />
  )
}

export const DataGrid = {
  Root: DataGridRoot,
  Header: DataGridHeader,
  Head: DataGridHead,
  Body: DataGridBody,
  Row: DataGridRow,
  Cell: DataGridCell,
}
