import type { ListBlock as BlockType } from '@shopfunnel/core/funnel/types'

export interface ListBlockProps {
  block: BlockType
  static?: boolean
}

export function ListBlock(_props: ListBlockProps) {
  return (
    <div className="flex h-12 items-center justify-center rounded-(--fun-radius) bg-(--fun-muted) text-sm text-(--fun-muted-foreground)">
      List block
    </div>
  )
}
