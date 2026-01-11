import { cn } from '@/lib/utils'
import type { MultipleChoiceBlock as BlockType } from '@shopfunnel/core/funnel/types'
import { ListBox as ReactAriaListbox, ListBoxItem as ReactAriaListboxItem } from 'react-aria-components'

export interface MultipleChoiceBlockProps {
  block: BlockType
  static?: boolean
  value?: string | string[] | null
  onValueChange?: (value: string | string[] | null) => void
}

export function MultipleChoiceBlock(props: MultipleChoiceBlockProps) {
  return (
    <div className="group-not-data-first/block:mt-6">
      <ReactAriaListbox
        className="flex flex-col gap-2"
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
            className={cn(
              // Base
              choice.media ? 'min-h-18 grid-cols-[auto_1fr]' : 'min-h-14 grid-cols-1',
              'group relative grid cursor-pointer overflow-hidden rounded-(--fun-radius) border-2 border-transparent bg-(--fun-muted) text-left transition-all outline-none',
              // Hover
              'hover:scale-[1.01]',
              // Focus
              'data-focus-visible:ring-3 data-focus-visible:ring-(--fun-ring)/50',
              // Selected
              'data-selected:border-(--fun-primary) data-selected:bg-(--fun-primary)/20 data-selected:text-(--fun-primary)',
              props.static && 'pointer-events-none',
            )}
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
          >
            {choice.media && (
              <div className="flex aspect-square h-full items-center justify-center">
                {choice.media.type === 'emoji' && <span className="text-[2.5rem]">{choice.media.value}</span>}
                {choice.media.type === 'image' && (
                  <img className="size-full object-cover" src={choice.media.value} alt="" />
                )}
              </div>
            )}
            <div className="flex flex-col justify-center py-3 pr-4 first:pl-4">
              <span className="text-base font-semibold text-(--fun-foreground) group-data-selected:text-(--fun-primary)">
                {choice.label}
              </span>
              {choice.description && (
                <span className="text-sm text-(--fun-muted-foreground) group-data-selected:text-(--fun-primary)/70">
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
