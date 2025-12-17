import { cn } from '@/lib/utils'
import { Button as ButtonPrimitive } from '@base-ui/react/button'

export function Button({ className, ...props }: ButtonPrimitive.Props) {
  return (
    <ButtonPrimitive
      className={cn(
        'h-11 rounded-(--radius) bg-primary text-base font-semibold text-primary-foreground hover:bg-(--primary)/80',
        className,
      )}
      {...props}
    />
  )
}
