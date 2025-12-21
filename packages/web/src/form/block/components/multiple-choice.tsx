import { cn } from '@/lib/utils'
import type { MultipleChoiceBlock } from '@shopfunnel/core/form/schema'
import { ListBox as ReactAriaListbox, ListBoxItem as ReactAriaListboxItem } from 'react-aria-components'

import { Field } from '@/form/components/field'

export type MultipleChoiceProps =
  | {
      mode: 'preview'
      schema: MultipleChoiceBlock
    }
  | {
      mode: 'live'
      schema: MultipleChoiceBlock
      value?: string | string[] | null
      onChange?: (value: string | string[] | null) => void
    }

export function MultipleChoice(props: MultipleChoiceProps) {
  return (
    <Field
      mode={props.mode}
      name={props.schema.id}
      label={props.schema.properties.label}
      description={props.schema.properties.description}
    >
      <ReactAriaListbox
        className="flex flex-col gap-2"
        disallowEmptySelection={props.mode === 'preview' ? false : !props.schema.properties.multiple}
        selectionMode={props.mode === 'preview' ? 'none' : props.schema.properties.multiple ? 'multiple' : 'single'}
        selectedKeys={
          props.mode === 'preview'
            ? undefined
            : Array.isArray(props.value)
              ? props.value
              : props.value
                ? [props.value]
                : undefined
        }
        onSelectionChange={(selection) => {
          if (props.mode === 'preview' || selection === 'all') return
          const value = Array.from(selection) as string[]
          props.onChange?.(props.schema.properties.multiple ? value : (value[0] ?? null))
        }}
      >
        {props.schema.properties.choices.map((choice) => (
          <ReactAriaListboxItem
            key={choice.id}
            id={choice.id}
            isDisabled={props.mode === 'preview'}
            className={cn(
              'relative flex items-center gap-3.5 rounded-[calc(var(--radius)+4px)] border-2 border-border bg-background px-4.5 py-3.5 text-left transition-all outline-none',
              props.mode !== 'preview' && [
                'cursor-pointer',
                'hover:border-border hover:bg-muted',
                'data-focused:border-primary data-focused:bg-primary/10',
                'data-selected:border-primary',
              ],
            )}
          >
            {choice.media?.type === 'emoji' && <span className="text-xl">{choice.media.value}</span>}
            <span className="flex-1 text-base font-semibold text-foreground">{choice.label}</span>
          </ReactAriaListboxItem>
        ))}
      </ReactAriaListbox>
    </Field>
  )
}
