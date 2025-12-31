import { cn } from '@/lib/utils'
import * as React from 'react'

function PaneRoot({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="pane-root" className={cn('flex h-full flex-col', className)} {...props}>
      {children}
    </div>
  )
}

function PaneHeader({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="pane-header"
      className={cn(
        'flex h-11 shrink-0 items-center justify-between border-b border-border px-3.5 not-first:border-t',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function PaneTitle({ children, className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span data-slot="pane-title" className={cn('text-xm font-medium', className)} {...props}>
      {children}
    </span>
  )
}

function PaneContent({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="pane-content" className={cn('flex flex-1 flex-col overflow-y-auto px-3.5', className)} {...props}>
      {children}
    </div>
  )
}

function PaneGroup({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="pane-group"
      className={cn('py-3.5 has-[>[data-slot=pane-group-header]]:pt-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function PaneGroupHeader({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="pane-group-header"
      className={cn('flex h-9 items-center justify-between pb-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function PaneGroupLabel({ children, className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span data-slot="pane-group-label" className={cn('text-xm font-medium', className)} {...props}>
      {children}
    </span>
  )
}

function PaneSeparator({ className, ...props }: React.ComponentProps<'hr'>) {
  return <hr data-slot="pane-separator" className={cn('bg-border', className)} {...props} />
}

export const Pane = {
  Root: PaneRoot,
  Header: PaneHeader,
  Title: PaneTitle,
  Content: PaneContent,
  Group: PaneGroup,
  GroupHeader: PaneGroupHeader,
  GroupLabel: PaneGroupLabel,
  Separator: PaneSeparator,
}
