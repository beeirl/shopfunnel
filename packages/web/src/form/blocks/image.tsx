import { cn } from '@/lib/utils'
import type { ImageBlock as ImageBlockData } from '@shopfunnel/core/form/types'
import { IconPhoto as PhotoIcon } from '@tabler/icons-react'

export interface ImageBlockProps {
  data: ImageBlockData
  index: number
  static?: boolean
}

export function ImageBlock(props: ImageBlockProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-(--sf-radius)',
        !props.data.properties.url && 'flex items-center justify-center bg-(--sf-color-primary)/10',
        props.index > 0 && 'mt-6',
      )}
      style={{ aspectRatio: props.data.properties.aspectRatio }}
    >
      {props.data.properties.url && <img src={props.data.properties.url} alt="" />}
      {!props.data.properties.url && <PhotoIcon className="size-14 text-(--sf-color-primary) opacity-30" />}
    </div>
  )
}
