import { Image } from '@/components/image'
import { cn } from '@/lib/utils'
import type { PictureChoiceBlock as BlockType } from '@shopfunnel/core/funnel/types'
import { IconPhoto as PhotoIcon } from '@tabler/icons-react'
import { ListBox as ReactAriaListbox, ListBoxItem as ReactAriaListboxItem } from 'react-aria-components'

export interface PictureChoiceBlockProps {
  block: BlockType
  static?: boolean
  variant?: 'outline' | 'soft'
  value?: string | string[] | null
  onValueChange?: (value: string | string[] | null) => void
}

export function PictureChoiceBlock(props: PictureChoiceBlockProps) {
  return (
    <div className="group-not-data-first/block:mt-6">
      <ReactAriaListbox
        className="grid grid-cols-2 gap-3"
        disallowEmptySelection={props.static ? false : !props.block.properties.multiple}
        selectionMode={props.static ? 'none' : props.block.properties.multiple ? 'multiple' : 'single'}
        selectedKeys={
          props.static ? undefined : Array.isArray(props.value) ? props.value : props.value ? [props.value] : []
        }
        onSelectionChange={(selection) => {
          if (props.static || selection === 'all') return
          const value = Array.from(selection) as string[]
          props.onValueChange?.(props.block.properties.multiple ? value : (value[0] ?? null))
        }}
      >
        {props.block.properties.options.map((choice) => (
          <ReactAriaListboxItem
            key={choice.id}
            id={choice.id}
            isDisabled={props.static}
            onClick={() => {
              if (!props.block.properties.multiple && props.value === choice.id) {
                props.onValueChange?.(choice.id)
              }
            }}
            onPointerDown={(e) => {
              if (!props.block.properties.multiple && props.value === choice.id) {
                e.preventDefault()
              }
            }}
            className={cn(
              // Base
              'group relative flex cursor-pointer flex-col overflow-hidden rounded-(--sf-radius) border-2 transition-all outline-none',
              'border-(--sf-border) data-selected:border-(--sf-primary)',
              // Hover
              'hover:scale-[1.02]',
              // Focus
              'data-focus-visible:ring-3 data-focus-visible:ring-(--sf-ring)/50',
              props.static && 'pointer-events-none',
            )}
          >
            <div className="relative aspect-4/3 w-full overflow-hidden bg-(--sf-muted)/40 group-data-selected:bg-(--sf-primary)/5">
              {choice.media?.value ? (
                <Image
                  src={choice.media.value}
                  alt={choice.label}
                  layout="fullWidth"
                  aspectRatio={4 / 3}
                  className="object-cover"
                  breakpoints={[186, 372, 560]}
                  priority={!props.static}
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <PhotoIcon className="size-12 text-(--sf-foreground) opacity-20 group-data-selected:text-(--sf-primary)" />
                </div>
              )}
            </div>
            <div
              className={cn(
                'flex flex-1 flex-col gap-0.5 px-3 py-2.5',
                props.variant === 'soft' &&
                  'bg-(--sf-muted) text-(--sf-foreground) group-data-selected:bg-(--sf-primary)/20 group-data-selected:text-(--sf-primary)',
                props.variant === 'outline' &&
                  'text-(--sf-foreground) group-data-selected:bg-(--sf-primary) group-data-selected:text-(--sf-primary-foreground)',
              )}
            >
              <span className="text-center text-sm font-semibold">{choice.label}</span>
              {choice.description && <span className="text-center text-xs opacity-70">{choice.description}</span>}
            </div>
          </ReactAriaListboxItem>
        ))}
      </ReactAriaListbox>
    </div>
  )
}
