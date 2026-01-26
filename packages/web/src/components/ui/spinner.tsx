import { cn } from '@/lib/utils'
import { IconLoader2 as LoaderIcon } from '@tabler/icons-react'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return <LoaderIcon role="status" aria-label="Loading" className={cn('size-4 animate-spin', className)} {...props} />
}

export { Spinner }
