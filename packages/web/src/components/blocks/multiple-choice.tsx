import { cn } from '@/lib/utils'
import type { MultipleChoiceBlock as BlockType } from '@shopfunnel/core/funnel/types'
import { ListBox as ReactAriaListbox, ListBoxItem as ReactAriaListboxItem } from 'react-aria-components'

export interface MultipleChoiceBlockProps {
  block: BlockType
  static?: boolean
  variant?: 'outline' | 'soft'
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
              'group relative flex min-h-14 cursor-pointer items-center overflow-hidden rounded-(--sf-radius) border-2 px-4 py-2 text-left transition-all outline-none hover:scale-[1.01]',
              props.variant === 'soft' &&
                'border-transparent bg-(--sf-muted) data-selected:border-(--sf-primary) data-selected:bg-(--sf-primary)/20 data-selected:text-(--sf-primary)',
              props.variant === 'outline' &&
                'border-(--sf-border) bg-(--sf-background) text-(--sf-foreground) data-selected:border-transparent data-selected:bg-(--sf-primary) data-selected:text-(--sf-primary-foreground)',
              // Focus
              'data-focus-visible:ring-3 data-focus-visible:ring-(--sf-ring)/50',
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
              <div className="-my-4 mr-2 -ml-4 flex size-14 items-center justify-center">
                {choice.media.type === 'emoji' && <span className="pl-1 text-[2rem]">{choice.media.value}</span>}
                {choice.media.type === 'image' && (
                  <img className="size-full object-cover" src={choice.media.value} alt="" />
                )}
              </div>
            )}
            <div className="flex flex-col justify-center">
              <span className="text-base font-semibold">{choice.label}</span>
              {choice.description && <span className="text-sm opacity-70">{choice.description}</span>}
            </div>
          </ReactAriaListboxItem>
        ))}
      </ReactAriaListbox>
    </div>
  )
}
