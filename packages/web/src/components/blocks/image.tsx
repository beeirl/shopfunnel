import { cn } from '@/lib/utils'
import type { ImageBlock as BlockType } from '@shopfunnel/core/quiz/types'
import { IconPhoto as PhotoIcon } from '@tabler/icons-react'

export interface ImageBlockProps {
  block: BlockType
  index: number
  static?: boolean
}

export function ImageBlock(props: ImageBlockProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-(--radius)',
        !props.block.properties.url && 'flex aspect-video items-center justify-center bg-muted',
      )}
    >
      {props.block.properties.url && <img src={props.block.properties.url} alt="" className="h-auto w-full" />}
      {!props.block.properties.url && <PhotoIcon className="size-14 text-foreground opacity-20" />}
    </div>
  )
}
