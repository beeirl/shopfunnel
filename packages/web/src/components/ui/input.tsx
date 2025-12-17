import { cva } from '@/lib/utils'
import { Input as InputPrimitive } from '@base-ui/react/input'

const inputVariants = cva({
  base: 'w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-sm transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-xm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
  variants: {
    size: {
      default: 'h-9',
      sm: 'h-8',
    },
  },
})

function Input({
  className,
  size = 'default',
  ...props
}: Omit<InputPrimitive.Props, 'size'> & {
  size?: 'sm' | 'default'
}) {
  return <InputPrimitive data-slot="input" className={inputVariants({ size, className })} {...props} />
}

export { Input }
