import { Field } from '@/form/components/field'
import { cn } from '@/lib/utils'
import { Input as BaseInput } from '@base-ui/react/input'
import type { ShortTextBlock as ShortTextBlockData } from '@shopfunnel/core/form/types'

export interface ShortTextBlockProps {
  data: ShortTextBlockData
  static?: boolean
  value?: string
  onValueChange?: (value: string) => void
}

export function ShortTextBlock(props: ShortTextBlockProps) {
  return (
    <Field
      static={props.static}
      name={props.data.id}
      label={props.data.properties.label}
      description={props.data.properties.description}
    >
      <BaseInput
        className={cn(
          // Base
          'h-14 w-full rounded-(--sf-radius) border px-4 text-base transition-all outline-none',
          'border-(--sf-color-primary)/50 bg-(--sf-color-background) text-(--sf-color-primary) placeholder:text-(--sf-color-primary-foreground)/50',
          // Hover
          'hover:border-(--sf-color-primary)/70',
          // Focus
          'focus:border-(--sf-color-primary) focus:ring focus:ring-(--sf-color-primary)',
          // Invalid
          'data-invalid:border-red-500',
          props.static && 'pointer-events-none',
        )}
        autoFocus
        disabled={props.static}
        placeholder={props.data.properties.placeholder}
        type={props.data.validations.email ? 'email' : 'text'}
        value={props.static ? undefined : (props.value ?? '')}
        onValueChange={props.static ? undefined : props.onValueChange}
      />
    </Field>
  )
}
