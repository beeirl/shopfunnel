import { Input as BaseInput } from '@/components/ui/input'
import { cn } from '@/utils/cn'

function Input({ className, ...props }: React.ComponentProps<typeof BaseInput>) {
  return <BaseInput className={cn('h-7 rounded-md border-0 bg-muted text-xs md:text-xs', className)} {...props} />
}

export { Input }
