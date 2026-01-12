import type { ListBlock as BlockType } from '@shopfunnel/core/funnel/types'

export interface ListBlockProps {
  block: BlockType
  static?: boolean
}

export function ListBlock(_props: ListBlockProps) {
  return (
    <div className="flex h-12 items-center justify-center rounded-(--sf-radius) bg-(--sf-muted) text-sm text-(--sf-muted-foreground)">
      List block
    </div>
  )
}
