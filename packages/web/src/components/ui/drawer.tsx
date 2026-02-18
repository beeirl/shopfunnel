import { DrawerPreview as DrawerPrimitive } from '@base-ui/react/drawer'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IconX } from '@tabler/icons-react'

type Side = 'top' | 'right' | 'bottom' | 'left'

const SWIPE_DIRECTION_MAP = {
  top: 'up',
  bottom: 'down',
  left: 'left',
  right: 'right',
} as const

const VIEWPORT_CLASSES = {
  top: 'items-start justify-center',
  bottom: 'items-end justify-center',
  left: 'items-stretch justify-start',
  right: 'items-stretch justify-end',
} as const

const DrawerSideContext = React.createContext<Side>('right')

function DrawerRoot({ side = 'right', ...props }: DrawerPrimitive.Root.Props & { side?: Side }) {
  return (
    <DrawerSideContext value={side}>
      <DrawerPrimitive.Root data-slot="drawer" swipeDirection={SWIPE_DIRECTION_MAP[side]} {...props} />
    </DrawerSideContext>
  )
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/10 transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-[swiping]:duration-0 supports-backdrop-filter:backdrop-blur-xs',
        className,
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DrawerPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const side = React.use(DrawerSideContext)
  const isHorizontal = side === 'left' || side === 'right'

  return (
    <DrawerPrimitive.Portal>
      <DrawerOverlay />
      <DrawerPrimitive.Viewport className={cn('fixed inset-0 z-50 flex', VIEWPORT_CLASSES[side])}>
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          data-side={side}
          className={cn(
            // Base styles
            'flex touch-auto flex-col overflow-y-auto overscroll-contain bg-background bg-clip-padding text-sm shadow-lg',
            // Transition
            'transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
            'data-[swiping]:select-none',
            'data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]',
            // Horizontal (left/right)
            isHorizontal && ['h-full w-3/4 sm:max-w-sm', '[transform:translateX(var(--drawer-swipe-movement-x))]'],
            // Vertical (top/bottom)
            !isHorizontal && ['w-full', '[transform:translateY(var(--drawer-swipe-movement-y))]'],
            // Per-side positioning & borders
            side === 'right' && 'border-l',
            side === 'left' && 'border-r',
            side === 'bottom' && 'border-t',
            side === 'top' && 'border-b',
            // Per-side enter/exit transforms
            side === 'right' &&
              'data-ending-style:[transform:translateX(100%)] data-starting-style:[transform:translateX(100%)]',
            side === 'left' &&
              'data-ending-style:[transform:translateX(-100%)] data-starting-style:[transform:translateX(-100%)]',
            side === 'bottom' &&
              'data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]',
            side === 'top' &&
              'data-ending-style:[transform:translateY(-100%)] data-starting-style:[transform:translateY(-100%)]',
            className,
          )}
          {...props}
        >
          <DrawerPrimitive.Content className="flex min-h-0 flex-1 flex-col gap-4">{children}</DrawerPrimitive.Content>
          {showCloseButton && (
            <DrawerPrimitive.Close
              data-slot="drawer-close"
              render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
            >
              <IconX />
              <span className="sr-only">Close</span>
            </DrawerPrimitive.Close>
          )}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="drawer-header" className={cn('flex flex-col gap-0.5 p-4', className)} {...props} />
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="drawer-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('text-base font-medium text-foreground', className)}
      {...props}
    />
  )
}

function DrawerDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export const Drawer = {
  Root: DrawerRoot,
  Trigger: DrawerTrigger,
  Close: DrawerClose,
  Overlay: DrawerOverlay,
  Content: DrawerContent,
  Header: DrawerHeader,
  Footer: DrawerFooter,
  Title: DrawerTitle,
  Description: DrawerDescription,
}
