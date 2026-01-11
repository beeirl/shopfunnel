import { cn } from '@/lib/utils'
import type { HeadingBlock as BlockType } from '@shopfunnel/core/funnel/types'

export interface HeadingBlockProps {
  block: BlockType
  static?: boolean
}

export function HeadingBlock(props: HeadingBlockProps) {
  return (
    <div
      className={cn('group-not-data-first/block:mt-3', props.block.properties.alignment === 'center' && 'text-center')}
    >
      <span className="text-2xl font-bold tracking-tight text-balance text-(--fun-foreground)">
        {props.block.properties.text}
      </span>
    </div>
  )
}
