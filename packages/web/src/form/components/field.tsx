import { Field as BaseField } from '@base-ui-components/react/field'
import { cn } from '@beeirl/ui/styles'

interface FieldProps {
  children: React.ReactNode
  className?: string
  mode?: 'preview' | 'live'
  name?: string
  label?: string
  description?: string
}

export function Field({ mode = 'live', name, label, description, children, className }: FieldProps) {
  return (
    <BaseField.Root className={cn('flex flex-col', className)} name={name}>
      {label && <BaseField.Label className="text-lg font-bold text-foreground">{label}</BaseField.Label>}
      {description && (
        <BaseField.Description className="mt-1 text-sm text-muted-foreground">{description}</BaseField.Description>
      )}
      <div className="mt-3">{children}</div>
      {mode === 'live' && <BaseField.Error className="mt-2 text-sm text-destructive" />}
    </BaseField.Root>
  )
}
