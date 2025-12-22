import { cn } from '@/lib/utils'
import { Button as BaseButton } from '@base-ui/react/button'

export type ButtonProps = BaseButton.Props & {
  static?: boolean
}

export function Button({ className, static: isStatic = false, ...props }: ButtonProps) {
  return (
    <BaseButton
      className={cn(
        'h-12 rounded-(--sf-radius) text-base font-semibold transition-all outline-none not-first:mt-6',
        'bg-(--sf-color-primary) text-(--sf-color-primary-foreground) hover:bg-(--sf-color-primary)/90',
        'focus:ring-2 focus:ring-(--sf-color-primary) focus:ring-offset-2',
        isStatic && 'pointer-events-none',
        className,
      )}
      {...props}
    />
  )
}
