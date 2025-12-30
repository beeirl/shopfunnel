import type { ListBlock as BlockType } from '@shopfunnel/core/form/types'

export interface ListBlockProps {
  block: BlockType
  index: number
  static?: boolean
}

export function ListBlock(_props: ListBlockProps) {
  return (
    <div className="flex h-12 items-center justify-center rounded-(--radius) bg-muted text-sm text-muted-foreground">
      List block
    </div>
  )
}
