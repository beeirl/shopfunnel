import { cn } from '@beeirl/ui/styles'
import type { MultipleChoiceBlock } from '@shopfunnel/core/funnel/schema'
import { ListBox as ReactAriaListbox, ListBoxItem as ReactAriaListboxItem } from 'react-aria-components'

import { Field } from '@/funnel/components/field'

export type MultipleChoiceProps =
  | {
      mode: 'preview'
      block: MultipleChoiceBlock
    }
  | {
      mode: 'live'
      block: MultipleChoiceBlock
      value?: string | string[] | null
      onChange?: (value: string | string[] | null) => void
    }

export function MultipleChoice(props: MultipleChoiceProps) {
  const choices = props.block.properties.choices.map((choice) => ({
    id: choice.id,
    label: choice.label,
    value: choice.id,
    attachment: choice.attachment
      ? choice.attachment.type === 'emoji'
        ? { type: 'emoji' as const, value: choice.attachment.emoji }
        : { type: 'image' as const, value: choice.attachment.url }
      : undefined,
  }))

  return (
    <Field
      mode={props.mode}
      name={props.block.id}
      label={props.block.properties.label}
      description={props.block.properties.description}
    >
      <ReactAriaListbox
        className="flex flex-col gap-2"
        disallowEmptySelection={props.mode === 'preview' ? false : !props.block.properties.multiple}
        selectionMode={props.mode === 'preview' ? 'none' : props.block.properties.multiple ? 'multiple' : 'single'}
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
          props.onChange?.(props.block.properties.multiple ? value : (value[0] ?? null))
        }}
      >
        {choices.map((choice) => (
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
            {choice.attachment?.type === 'emoji' && <span className="text-xl">{choice.attachment.value}</span>}
            <span className="flex-1 text-base font-semibold text-foreground">{choice.label}</span>
          </ReactAriaListboxItem>
        ))}
      </ReactAriaListbox>
    </Field>
  )
}
