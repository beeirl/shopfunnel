import { Image } from '@/components/image'
import { cn } from '@/lib/utils'
import type { ImageBlock as BlockType } from '@shopfunnel/core/funnel/types'
import { IconPhoto as PhotoIcon } from '@tabler/icons-react'

export interface ImageBlockProps {
  block: BlockType
  static?: boolean
}

export function ImageBlock(props: ImageBlockProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-(--sf-radius) group-not-data-first/block:mt-6',
        !props.block.properties.url && 'flex aspect-video items-center justify-center bg-(--sf-muted)',
      )}
    >
      {props.block.properties.url && (
        <Image
          src={props.block.properties.url}
          alt=""
          layout="fullWidth"
          breakpoints={[384, 768, 1080]}
          priority={!props.static}
        />
      )}
      {!props.block.properties.url && <PhotoIcon className="size-14 text-(--sf-foreground) opacity-20" />}
    </div>
  )
}
