import { cn } from '@beeirl/ui/styles'
import { ListBox, ListBoxItem } from 'react-aria-components'
import type { FormBlock } from '../types'
import { Field } from './field'

export interface MultipleChoiceBlockProps {
  block: Extract<FormBlock, { type: 'multiple_choice' }>
  value?: string | string[]
  onValueChange: (value: string | string[]) => void
}

export function MultipleChoiceBlock({ block, value, onValueChange }: MultipleChoiceBlockProps) {
  return (
    <Field.Root name={block.id}>
      <Field.Label>{block.properties.label}</Field.Label>
      {block.properties.description && <Field.Description>{block.properties.description}</Field.Description>}
      <ListBox
        aria-label={block.properties.label}
        selectionMode={block.properties.multiple ? 'multiple' : 'single'}
        disallowEmptySelection={!block.properties.multiple}
        selectedKeys={value}
        onSelectionChange={(selection) => {
          if (selection === 'all') return
          onValueChange(Array.from(selection) as string[])
        }}
        className="flex flex-col gap-3"
      >
        {block.properties.choices.map((choice) => (
          <ListBoxItem
            key={choice.id}
            id={choice.id}
            className={cn(
              'flex cursor-pointer items-center gap-3.5 rounded-xl border-2 border-gray-200 px-4.5 py-3.5 text-left transition-all outline-none',
              'hover:border-gray-300 hover:bg-gray-50',
              'data-selected:border-blue-500',
              'data-focused:border-blue-500 data-focused:bg-blue-50',
            )}
            onClick={() => {
              if (block.properties.multiple) return
              if (value !== choice.id) return
              onValueChange(choice.id)
            }}
          >
            {choice.attachment?.type === 'emoji' && <span className="text-xl">{choice.attachment.emoji}</span>}
            <span className="flex-1 text-base font-semibold text-gray-900">{choice.label}</span>
          </ListBoxItem>
        ))}
      </ListBox>
    </Field.Root>
  )
}
