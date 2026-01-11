import { cn } from '@/lib/utils'
import type { ParagraphBlock as BlockType } from '@shopfunnel/core/funnel/types'

export interface ParagraphBlockProps {
  block: BlockType
  static?: boolean
}

export function ParagraphBlock(props: ParagraphBlockProps) {
  return (
    <div
      className={cn('group-not-data-first/block:mt-3', props.block.properties.alignment === 'center' && 'text-center')}
    >
      <span className="text-[0.9375rem] tracking-tight text-balance text-(--fun-muted-foreground)">
        {props.block.properties.text}
      </span>
    </div>
  )
}
