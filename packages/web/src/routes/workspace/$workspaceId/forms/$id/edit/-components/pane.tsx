import { cn } from '@/lib/utils'
import * as React from 'react'

function PaneRoot({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-col pb-3.5 not-first:border-t not-first:border-border', className)} {...props}>
      {children}
    </div>
  )
}

function PaneHeader({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex h-11 items-center justify-between', className)} {...props}>
      {children}
    </div>
  )
}

function PaneTitle({ children, className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span className={cn('text-xm font-medium', className)} {...props}>
      {children}
    </span>
  )
}

export const Pane = {
  Header: PaneHeader,
  Root: PaneRoot,
  Title: PaneTitle,
}
