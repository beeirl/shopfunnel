import type { ListBlock } from '@shopfunnel/core/form/schema'

export interface ListProps {
  block: ListBlock
}

export function List(_props: ListProps) {
  return (
    <div className="flex h-12 items-center justify-center rounded-[var(--radius)] bg-muted text-sm text-muted-foreground">
      List block
    </div>
  )
}
