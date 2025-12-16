import { cn } from '@/utils/cn'
import * as React from 'react'

interface PaneRootProps extends React.ComponentProps<'div'> {}

function PaneRoot({ children, className, ...props }: PaneRootProps) {
  return (
    <div className={cn('not-first:border-t not-first:border-gray-200', className)} {...props}>
      {children}
    </div>
  )
}

interface PaneHeaderProps extends React.ComponentProps<'div'> {}

function PaneHeader({ children, className, ...props }: PaneHeaderProps) {
  return (
    <div className={cn('flex h-10 items-center justify-between px-4', className)} {...props}>
      {children}
    </div>
  )
}

interface PaneTitleProps extends React.ComponentProps<'span'> {}

function PaneTitle({ children, className, ...props }: PaneTitleProps) {
  return (
    <span className={cn('text-xs font-semibold', className)} {...props}>
      {children}
    </span>
  )
}

interface PaneContentProps extends React.ComponentProps<'div'> {}

function PaneContent({ children, className, ...props }: PaneContentProps) {
  return (
    <div className={cn('flex flex-col px-4 pb-4', className)} {...props}>
      {children}
    </div>
  )
}

export { PaneContent, PaneHeader, PaneRoot, PaneTitle }
