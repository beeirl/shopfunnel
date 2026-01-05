import { cn } from '@/lib/utils'
import * as React from 'react'

export interface NextButtonProps extends Omit<React.ComponentProps<'button'>, 'disabled'> {
  static?: boolean
}

export function NextButton({ className, children, static: isStatic, ...props }: NextButtonProps) {
  return (
    <button
      className={cn(
        'block h-12 w-full rounded-(--qz-radius) text-base font-semibold transition-all outline-none',
        'bg-(--qz-primary) text-(--qz-primary-foreground)',
        !isStatic && 'hover:bg-(--qz-primary)/90',
        'focus-visible:ring-3 focus-visible:ring-(--qz-ring)/50',
        className,
      )}
      disabled={isStatic}
      {...props}
    >
      {children}
    </button>
  )
}
