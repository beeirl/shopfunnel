import type { ListBlock } from '@shopfunnel/core/form/schema'

export interface ListProps {
  schema: ListBlock
}

export function List(props: ListProps) {
  return (
    <div className="flex h-12 items-center justify-center rounded-(--radius) bg-muted text-sm text-muted-foreground">
      List block
    </div>
  )
}
