import { cn } from '@/lib/utils'
import * as React from 'react'

export function Panel({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="panel"
      className={cn(
        'flex h-full w-full max-w-sm flex-col border-border bg-background first:border-r last:border-l',
        className,
      )}
      {...props}
    />
  )
}
