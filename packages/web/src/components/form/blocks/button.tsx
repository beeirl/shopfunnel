import { cn } from '@beeirl/ui/styles'
import type * as React from 'react'

export function Button({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      className={cn(
        'w-full rounded-lg bg-blue-500 px-6 py-3 text-lg font-bold text-white transition-colors hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}
