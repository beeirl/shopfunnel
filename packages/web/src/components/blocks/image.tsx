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
        'w-full overflow-hidden rounded-(--qz-radius)',
        !props.block.properties.url && 'flex aspect-video items-center justify-center bg-(--qz-muted)',
      )}
    >
      {props.block.properties.url && <img src={props.block.properties.url} alt="" className="h-auto w-full" />}
      {!props.block.properties.url && <PhotoIcon className="size-14 text-(--qz-foreground) opacity-20" />}
    </div>
  )
}
