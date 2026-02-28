import { cn } from '@/lib/utils'
import * as React from 'react'

function FieldRoot({ className, children }: React.ComponentProps<'div'>) {
  return <div className={cn('flex min-h-[40px] w-full justify-between gap-4 py-1 pl-3.5', className)}>{children}</div>
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-fit min-h-[32px] flex-1 grow items-center">
      <span className="text-xm text-muted-foreground">{children}</span>
    </div>
  )
}

function FieldControl({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 grow-2 items-center gap-1">{children}</div>
}

export const Field = {
  Root: FieldRoot,
  Label: FieldLabel,
  Control: FieldControl,
}
