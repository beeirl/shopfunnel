import { Input as BaseInput } from '@base-ui-components/react'
import { cn } from '@beeirl/ui/styles'
import type { FormBlock } from '../types'
import { Field } from './field'

export interface TextInputBlockProps extends BaseInput.Props {
  block: Extract<FormBlock, { type: 'text_input' }>
}

export function TextInputBlock({ block, className, ...props }: TextInputBlockProps) {
  return (
    <Field.Root name={block.id}>
      <Field.Label>{block.properties.label}</Field.Label>
      {block.properties.description && <Field.Description>{block.properties.description}</Field.Description>}
      <BaseInput
        type={block.validations.email ? 'email' : 'text'}
        maxLength={block.validations.maxLength}
        className={cn(
          'w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-base transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none',
          'data-invalid:border-red-500',
          className,
        )}
        placeholder={block.validations.email ? 'Enter your email' : 'Type your answer...'}
        {...props}
      />
      <Field.Error />
    </Field.Root>
  )
}
