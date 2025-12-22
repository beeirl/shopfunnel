import { Field } from '@/form/components/field'
import { cn } from '@/lib/utils'
import type { MultipleChoiceBlock as MultipleChoiceBlockData } from '@shopfunnel/core/form/types'
import { ListBox as ReactAriaListbox, ListBoxItem as ReactAriaListboxItem } from 'react-aria-components'

export interface MultipleChoiceBlockProps {
  data: MultipleChoiceBlockData
  static?: boolean
  value?: string | string[] | null
  onValueChange?: (value: string | string[] | null) => void
}

export function MultipleChoiceBlock(props: MultipleChoiceBlockProps) {
  return (
    <Field
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
              'relative flex h-14 cursor-pointer items-center gap-3.5 rounded-(--sf-radius) px-4 text-left text-base transition-all outline-none',
              'border border-(--sf-color-primary)/50 bg-(--sf-color-primary)/15 text-(--sf-color-primary)',
              // Hover
              'hover:scale-[1.01] hover:border-(--sf-color-primary)/70 hover:bg-(--sf-color-primary)/30',
              // Focus
              'data-focused:ring-2 data-focused:ring-(--sf-color-primary) data-focused:ring-offset-2',
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
            {choice.media?.type === 'emoji' && <span className="text-xl">{choice.media.value}</span>}
            <span className="flex-1 text-base font-semibold">{choice.label}</span>
          </ReactAriaListboxItem>
        ))}
      </ReactAriaListbox>
    </Field>
  )
}
