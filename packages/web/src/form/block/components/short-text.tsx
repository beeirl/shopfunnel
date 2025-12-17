import { cn } from '@/lib/utils'
import { Input as BaseInput } from '@base-ui/react/input'
import type { ShortTextBlock } from '@shopfunnel/core/form/schema'

import { Field } from '@/form/components/field'

export type ShortTextProps =
  | {
      mode: 'preview'
      block: ShortTextBlock
    }
  | {
      mode: 'live'
      block: ShortTextBlock
      value?: string
      onChange?: (value: string) => void
    }

export function ShortText(props: ShortTextProps) {
  return (
    <Field
      mode={props.mode}
      name={props.block.id}
      label={props.block.properties.label}
      description={props.block.properties.description}
    >
      <BaseInput
        className={cn(
          'w-full rounded-(--radius) border-2 border-border bg-background px-4 py-2.5 text-base text-foreground transition-colors placeholder:text-muted-foreground',
          'focus:border-primary focus:outline-none',
          'data-invalid:border-destructive',
          props.mode === 'preview' && 'pointer-events-none',
        )}
        disabled={props.mode === 'preview'}
        placeholder={props.block.properties.placeholder}
        type={props.block.validations.email ? 'email' : 'text'}
        value={props.mode === 'preview' ? undefined : props.value}
        onChange={props.mode === 'preview' ? undefined : (e) => props.onChange?.(e.target.value)}
      />
    </Field>
  )
}
