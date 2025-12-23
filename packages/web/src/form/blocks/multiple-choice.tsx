import { Field } from '@/form/components/field'
import { cn } from '@/lib/utils'
import type { MultipleChoiceBlock as MultipleChoiceBlockData } from '@shopfunnel/core/form/types'
import { ListBox as ReactAriaListbox, ListBoxItem as ReactAriaListboxItem } from 'react-aria-components'

export interface MultipleChoiceBlockProps {
  data: MultipleChoiceBlockData
  index: number
  static?: boolean
  value?: string | string[] | null
  onValueChange?: (value: string | string[] | null) => void
}

export function MultipleChoiceBlock(props: MultipleChoiceBlockProps) {
  return (
    <Field
      className={cn(props.index > 0 && 'mt-6')}
      static={props.static}
      name={props.data.id}
      label={props.data.properties.label}
      description={props.data.properties.description}
    >
      <ReactAriaListbox
        className="flex flex-col gap-2"
        disallowEmptySelection={props.static ? false : !props.data.properties.multiple}
        selectionMode={props.static ? 'none' : props.data.properties.multiple ? 'multiple' : 'single'}
        selectedKeys={
          props.static ? undefined : Array.isArray(props.value) ? props.value : props.value ? [props.value] : []
        }
        onSelectionChange={(selection) => {
          if (props.static || selection === 'all') return
          const value = Array.from(selection) as string[]
          props.onValueChange?.(props.data.properties.multiple ? value : (value[0] ?? null))
        }}
      >
        {props.data.properties.choices.map((choice) => (
          <ReactAriaListboxItem
            key={choice.id}
            id={choice.id}
            isDisabled={props.static}
            className={cn(
              // Base
              choice.media ? 'min-h-18 grid-cols-[auto_1fr]' : 'min-h-14 grid-cols-1',
              'relative grid cursor-pointer overflow-hidden rounded-(--sf-radius) text-left text-base transition-all outline-none',
              'border border-(--sf-color-primary)/50 bg-(--sf-color-primary)/15 text-(--sf-color-primary)',
              // Hover
              'hover:scale-[1.01] hover:border-(--sf-color-primary)/70 hover:bg-(--sf-color-primary)/30',
              // Focus
              'data-focus-visible:ring-2 data-focus-visible:ring-(--sf-color-primary) data-focus-visible:ring-offset-2',
              // Selected
              'data-selected:border-2 data-selected:border-(--sf-color-primary) data-selected:bg-(--sf-color-background) data-selected:hover:border-(--sf-color-primary) data-selected:hover:bg-(--sf-color-background)',
              props.static && 'pointer-events-none',
            )}
            onClick={() => {
              if (!props.data.properties.multiple && props.value === choice.id) {
                props.onValueChange?.(choice.id)
              }
            }}
            onPointerDown={(e) => {
              if (!props.data.properties.multiple && props.value === choice.id) {
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
              <span className="text-base font-semibold">{choice.label}</span>
              {choice.description && <span className="text-sm text-(--sf-color-primary)/70">{choice.description}</span>}
            </div>
          </ReactAriaListboxItem>
        ))}
      </ReactAriaListbox>
    </Field>
  )
}
