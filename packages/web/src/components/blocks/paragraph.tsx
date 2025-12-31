import { cn } from '@/lib/utils'
import type { ParagraphBlock as BlockType } from '@shopfunnel/core/quiz/types'

export interface ParagraphBlockProps {
  block: BlockType
  index: number
  static?: boolean
}

export function ParagraphBlock(props: ParagraphBlockProps) {
  return (
    <div className={cn(props.index > 0 && 'mt-3')}>
      <p
        className={cn(
          'text-[0.9375rem] tracking-tight text-balance text-muted-foreground',
          props.block.properties.alignment === 'center' && 'text-center',
        )}
      >
        {props.block.properties.text}
      </p>
    </div>
  )
}
