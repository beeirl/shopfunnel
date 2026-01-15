import { cn } from '@/lib/utils'
import { Button } from '@base-ui/react/button'
import { IconLoader2 as LoaderIcon } from '@tabler/icons-react'

export type NextButtonProps = Button.Props & {
  loading?: boolean
  static?: boolean
}

export function NextButton({ className, children, loading, static: isStatic, ...props }: NextButtonProps) {
  return (
    <Button
      className={cn(
        'flex h-12 w-full items-center justify-center gap-2 rounded-(--sf-radius) text-base font-semibold transition-all outline-none',
        'bg-(--sf-primary) text-(--sf-primary-foreground)',
        loading && 'pointer-events-none opacity-50',
        !isStatic && 'hover:bg-(--sf-primary)/90',
        'focus-visible:ring-3 focus-visible:ring-(--sf-ring)/50',
        className,
      )}
      disabled={isStatic || loading}
      {...props}
    >
      {loading && <LoaderIcon className="size-4.5 animate-spin" />}
      {loading ? 'Loading...' : children}
    </Button>
  )
}
