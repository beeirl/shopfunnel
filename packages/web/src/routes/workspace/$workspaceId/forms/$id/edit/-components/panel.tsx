import { cn } from '@/lib/utils'
import * as React from 'react'

function PanelRoot({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex w-[300px] flex-col border-border bg-[hsl(0,0%,99%)]/95 first:border-r last:border-l',
        className,
      )}
      {...props}
    />
  )
}

function PanelHeader({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex h-11 shrink-0 items-center justify-between border-b border-border px-3.5', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function PanelTitle({ children, className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span className={cn('text-xm font-medium', className)} {...props}>
      {children}
    </span>
  )
}

function PanelContent({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-1 flex-col gap-2 overflow-y-auto px-3.5', className)} {...props}>
      {children}
    </div>
  )
}

export const Panel = {
  Header: PanelHeader,
  Root: PanelRoot,
  Title: PanelTitle,
  Content: PanelContent,
}
