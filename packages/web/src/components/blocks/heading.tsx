import { cn } from '@/lib/utils'
import type { HeadingBlock as BlockType } from '@shopfunnel/core/form/types'

export interface HeadingBlockProps {
  block: BlockType
  index: number
  static?: boolean
}

export function HeadingBlock(props: HeadingBlockProps) {
  return (
    <div className={cn(props.index > 0 && 'mt-3')}>
      <h2
        className={cn(
          'text-2xl font-bold tracking-tight text-balance text-foreground',
          props.block.properties.alignment === 'center' && 'text-center',
        )}
      >
        {props.block.properties.text}
      </h2>
    </div>
  )
}
