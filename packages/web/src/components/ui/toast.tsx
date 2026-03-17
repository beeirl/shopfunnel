import { cn } from '@/lib/utils'
import { Toast as BaseToast } from '@base-ui/react/toast'
import { IconX as XIcon } from '@tabler/icons-react'

export const createToastManager = BaseToast.createToastManager

function ToastRoot(props: BaseToast.Root.Props) {
  return (
    <BaseToast.Root
      className={cn(
        // CSS custom properties
        '[--gap:0.75rem] [--peek:0.75rem]',
        '[--scale:calc(max(0,1-(var(--toast-index)*0.1)))]',
        '[--shrink:calc(1-var(--scale))]',
        '[--height:var(--toast-frontmost-height,var(--toast-height))]',
        '[--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]',
        // Base
        'absolute right-0 bottom-0 left-auto z-[calc(1000-var(--toast-index))] mr-0 w-full origin-bottom',
        'rounded-xl border border-border bg-card bg-clip-padding px-3.5 py-2.5 text-card-foreground shadow-xs select-none',
        'after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[""]',
        // Height
        'h-(--height) data-expanded:h-(--toast-height)',
        // Stacked transform
        'transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]',
        // Expanded transform
        'data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))]',
        // Transition
        '[transition:transform_0.5s_cubic-bezier(0.22,1,0.36,1),opacity_0.5s,height_0.15s]',
        // Starting / ending styles
        'data-starting-style:transform-[translateY(150%)]',
        'data-ending-style:opacity-0',
        'data-limited:opacity-0',
        '[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(150%)]',
        // Swipe direction ending styles
        'data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))]',
        'data-expanded:data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))]',
        'data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]',
        'data-expanded:data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]',
        'data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
        'data-expanded:data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
        'data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))]',
        'data-expanded:data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))]',
      )}
      {...props}
    >
      <BaseToast.Title className="text-sm font-semibold" />
      <BaseToast.Description className="mt-1 text-sm text-muted-foreground" />
      <BaseToast.Close
        className="absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Close"
      >
        <XIcon className="size-3.5" />
      </BaseToast.Close>
    </BaseToast.Root>
  )
}

function ToastViewport({ className, ...props }: BaseToast.Viewport.Props & { className?: string }) {
  return (
    <BaseToast.Viewport
      className={cn(
        'fixed top-auto right-4 bottom-4 mx-auto flex w-[250px] sm:right-8 sm:bottom-8 sm:w-[300px]',
        className,
      )}
      {...props}
    />
  )
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager()
  return toasts.map((toast) => <ToastRoot key={toast.id} toast={toast} />)
}

export interface ToastManagerProps extends Omit<BaseToast.Provider.Props, 'children' | 'toastManager'> {
  manager: BaseToast.Provider.Props['toastManager']
}

export function ToastManager({ manager, ...props }: ToastManagerProps) {
  return (
    <BaseToast.Provider toastManager={manager} {...props}>
      <ToastViewport>
        <ToastList />
      </ToastViewport>
    </BaseToast.Provider>
  )
}
