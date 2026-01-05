import type { ListBlock as BlockType } from '@shopfunnel/core/quiz/types'

export interface ListBlockProps {
  block: BlockType
  index: number
  static?: boolean
}

export function ListBlock(_props: ListBlockProps) {
  return (
    <div className="flex h-12 items-center justify-center rounded-(--qz-radius) bg-(--qz-muted) text-sm text-(--qz-muted-foreground)">
      List block
    </div>
  )
}
