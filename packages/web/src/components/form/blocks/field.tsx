import { Field as BaseField } from '@base-ui-components/react'
import { cn } from '@beeirl/ui/styles'

function FieldRoot({ className, ...props }: BaseField.Root.Props) {
  return <BaseField.Root className={cn('group flex flex-col not-first:mt-5', className)} {...props} />
}

function FieldLabel({ className, ...props }: BaseField.Label.Props) {
  return (
    <BaseField.Label
      className={cn(
        'text-center text-lg font-bold group-first:mb-2 group-first:text-2xl group-first:font-extrabold sm:group-first:text-3xl',
        className,
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: BaseField.Description.Props) {
  return (
    <BaseField.Description
      className={cn('mb-3 text-center text-sm text-gray-500 group-first:mb-5 group-first:font-medium', className)}
      {...props}
    />
  )
}

function FieldError({ className, ...props }: BaseField.Error.Props) {
  return <BaseField.Error className={cn('mt-1 text-sm text-red-500', className)} {...props} />
}

export const Field = {
  Root: FieldRoot,
  Label: FieldLabel,
  Description: FieldDescription,
  Error: FieldError,
}
