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
        !props.data.properties.url && 'flex aspect-video items-center justify-center bg-(--sf-color-primary)/10',
        props.index > 0 && 'mt-6',
      )}
    >
      {props.data.properties.url && <img src={props.data.properties.url} alt="" className="h-auto w-full" />}
      {!props.data.properties.url && <PhotoIcon className="size-14 text-(--sf-color-primary) opacity-30" />}
    </div>
  )
}
