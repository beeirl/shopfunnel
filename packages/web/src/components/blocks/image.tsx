import { cn } from '@/lib/utils'
import type { ImageBlock as BlockType } from '@shopfunnel/core/funnel/types'
import { IconPhoto as PhotoIcon } from '@tabler/icons-react'

export interface ImageBlockProps {
  block: BlockType
  static?: boolean
}

export function ImageBlock({ block }: ImageBlockProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-(--fun-radius) group-not-data-first/block:mt-6',
        !block.properties.url && 'flex aspect-video items-center justify-center bg-(--fun-muted)',
      )}
    >
      {block.properties.url && <img src={block.properties.url} alt="" className="h-auto w-full" />}
      {!block.properties.url && <PhotoIcon className="size-14 text-(--fun-foreground) opacity-20" />}
    </div>
  )
}
