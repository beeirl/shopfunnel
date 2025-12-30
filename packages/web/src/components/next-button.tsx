import { cn } from '@/lib/utils'
import * as React from 'react'

export function NextButton({ className, children, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      className={cn(
        'mx-auto block h-12 w-full max-w-sm rounded-(--radius) text-base font-semibold transition-all outline-none',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
