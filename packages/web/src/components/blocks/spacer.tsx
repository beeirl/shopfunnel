import { cn } from '@/lib/utils'
import type { SpacerBlock as BlockType } from '@shopfunnel/core/funnel/types'

export interface SpacerBlockProps {
  block: BlockType
  static?: boolean
}

const SIZE_CLASSES = {
  sm: 'h-4',
  md: 'h-8',
  lg: 'h-16',
} as const

export function SpacerBlock(props: SpacerBlockProps) {
  return <div className={cn(SIZE_CLASSES[props.block.properties.size])} />
}
