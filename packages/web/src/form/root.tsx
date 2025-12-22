import { cn } from '@/lib/utils'
import type { Theme } from '@shopfunnel/core/form/types'
import * as React from 'react'

export interface FormRootProps {
  theme: Theme
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function FormRoot({ theme, children, className, onClick }: FormRootProps) {
  return (
    <div
      className={cn('relative', className)}
      style={
        {
          '--sf-color-primary': theme.colors.primary,
          '--sf-color-primary-foreground': theme.colors.primaryForeground,
          '--sf-color-background': theme.colors.background,
          '--sf-color-foreground': theme.colors.foreground,
          '--sf-radius': theme.radius.value,
        } as React.CSSProperties
      }
      onClick={onClick}
    >
      {children}
      <div className="absolute inset-0 -z-10 bg-(--sf-color-background)" />
    </div>
  )
}
