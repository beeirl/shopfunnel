import { Field as BaseField } from '@/components/ui/field'
import { cn } from '@/utils/cn'

function FieldLabel({ className, ...props }: React.ComponentProps<typeof BaseField.Label>) {
  return <BaseField.Label className={cn('text-xs text-muted-foreground', className)} {...props} />
}

export const Field = {
  ...BaseField,
  Label: FieldLabel,
}
