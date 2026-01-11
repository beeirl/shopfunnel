import { cn } from '@/lib/utils'
import type { PictureChoiceBlock as BlockType } from '@shopfunnel/core/funnel/types'
import { IconPhoto as PhotoIcon } from '@tabler/icons-react'
import { ListBox as ReactAriaListbox, ListBoxItem as ReactAriaListboxItem } from 'react-aria-components'

export interface PictureChoiceBlockProps {
  block: BlockType
  static?: boolean
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
              'group relative flex cursor-pointer flex-col overflow-hidden rounded-(--fun-radius) border-2 border-(--fun-border) transition-all outline-none',
              // Hover
              'hover:scale-[1.02]',
              // Focus
              'data-focus-visible:ring-3 data-focus-visible:ring-(--fun-ring)/50',
              // Selected
              'data-selected:border-(--fun-primary)',
              props.static && 'pointer-events-none',
            )}
          >
            <div className="relative aspect-4/3 w-full overflow-hidden bg-(--fun-muted)/50 group-data-selected:bg-(--fun-primary)/5">
              {choice.media?.value ? (
                <img src={choice.media.value} alt={choice.label} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <PhotoIcon className="size-12 text-(--fun-foreground) opacity-20 group-data-selected:text-(--fun-primary)" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5 bg-(--fun-muted) px-3 py-2.5 group-data-selected:bg-(--fun-primary)/20">
              <span className="text-center text-sm font-semibold text-(--fun-foreground) group-data-selected:text-(--fun-primary)">
                {choice.label}
              </span>
              {choice.description && (
                <span className="text-center text-xs text-(--fun-muted-foreground) group-data-selected:text-(--fun-primary)/70">
                  {choice.description}
                </span>
              )}
            </div>
          </ReactAriaListboxItem>
        ))}
      </ReactAriaListbox>
    </div>
  )
}
