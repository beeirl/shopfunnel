import * as React from 'react'

import { cn } from '@/utils/cn'

function HeadingRoot({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="heading" className={cn('flex min-h-10 items-center justify-between gap-4', className)} {...props} />
  )
}

function HeadingContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="heading-content" className={cn('flex flex-col', className)} {...props} />
}

function HeadingTitle({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="heading-title" className={cn('block text-lg font-semibold', className)} {...props} />
}

function HeadingDescription({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span data-slot="heading-description" className={cn('block text-sm text-muted-foreground', className)} {...props} />
  )
}

function HeadingActions({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="heading-actions" className={cn('flex items-center gap-2', className)} {...props} />
}

export const Heading = {
  Root: HeadingRoot,
  Content: HeadingContent,
  Title: HeadingTitle,
  Description: HeadingDescription,
  Actions: HeadingActions,
}
