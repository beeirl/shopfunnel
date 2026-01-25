import { cn } from '@/lib/utils'
import { Toast as BaseToast } from '@base-ui/react/toast'
import * as React from 'react'

function AnimatedCheckmarkCircle(props: React.ComponentProps<'svg'>) {
  return (
    <svg data-component="animated-checkmark-circle" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="10" fill="#22c55e" />
      <path
        d="M8 12.5L10.5 15L16.5 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="20"
      />
    </svg>
  )
}

function AnimatedCrossCircle(props: React.ComponentProps<'svg'>) {
  return (
    <svg data-component="animated-cross-circle" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="10" fill="#ef4444" />
      <path
        d="M9 9L15 15"
        stroke="white"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="10"
      />
      <path
        d="M15 9L9 15"
        stroke="white"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="10"
      />
    </svg>
  )
}

function AnimatedExclamationMarkCircle(props: React.ComponentProps<'svg'>) {
  return (
    <svg data-component="animated-exclamation-mark-circle" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="10" fill="#ff9029" />
      <path
        d="M12 7.5V12.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="5"
      />
      <circle cx="12" cy="16" r="1.3" fill="white" />
    </svg>
  )
}

function AnimatedLoaderCircle(props: React.ComponentProps<'svg'>) {
  return (
    <svg data-component="animated-loader-circle" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="10" fill="#3b82f6" />
      <circle
        cx="12"
        cy="12"
        r="6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="38"
        strokeDashoffset="7"
      />
    </svg>
  )
}

interface SnackbarRootProps extends Omit<BaseToast.Root.Props, 'swipeDirection'> {}

function SnackbarRoot(props: SnackbarRootProps) {
  const { type } = props.toast
  return (
    <BaseToast.Root
      className={cn(
        // Base
        'absolute top-0 z-[calc(1000-var(--toast-index))] mx-auto inline-flex items-start gap-1.5',
        'rounded-lg bg-primary bg-clip-padding px-2 py-1 [box-shadow:rgba(0,0,0,0.05)_0px_0px_0px_0.5px,rgba(0,0,0,0.06)_0px_2px_4px_-1px,rgba(0,0,0,0.08)_0px_6px_40px_-2px] select-none',
        'after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[""]',

        // Transition
        'transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+calc(min(var(--toast-index),10)*15px)))_scale(calc(max(0,1-(var(--toast-index)*0.1))))]',
        'transition-all [transition-property:opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'data-ending-style:opacity-0 data-limited:opacity-0',
        'data-starting-style:transform-[translateY(-150%)_scale(0.1)]',
        'data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-offset-y)+calc(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y)))]',
        'data-ending-style:data-swipe-direction-up:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))]',
        'data-expanded:data-ending-style:data-swipe-direction-up:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))]',
        '[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(-150%)]',
      )}
      style={{
        ['--gap' as string]: '1rem',
        ['--offset-y' as string]:
          'calc(var(--toast-offset-y) + (var(--toast-index) * var(--gap)) + var(--toast-swipe-movement-y))',
      }}
      swipeDirection="up"
      {...props}
    >
      {type === 'success' && <AnimatedCheckmarkCircle className="size-6 shrink-0" />}
      {type === 'error' && <AnimatedCrossCircle className="size-6 shrink-0" />}
      {type === 'warning' && <AnimatedExclamationMarkCircle className="size-6 shrink-0" />}
      {type === 'loading' && <AnimatedLoaderCircle className="size-6 shrink-0" />}
      <span className="mt-[0.15625rem] leading-none">
        <BaseToast.Title className="inline text-xm text-primary-foreground" />
        <BaseToast.Description className="ml-1 inline text-xs text-primary-foreground/70" />
      </span>
    </BaseToast.Root>
  )
}

interface SnackbarViewportProps extends BaseToast.Viewport.Props {
  className?: string
}

function SnackbarViewport({ className, ...props }: SnackbarViewportProps) {
  return (
    <BaseToast.Viewport
      className={cn('fixed inset-x-4 top-4 bottom-auto z-10 mx-auto flex justify-center', className)}
      {...props}
    />
  )
}

function SnackbarList() {
  const { toasts } = BaseToast.useToastManager()
  return toasts.map((toast) => <SnackbarRoot key={toast.id} toast={toast} />)
}

export const createSnackbarManager = BaseToast.createToastManager

export interface SnackbarManagerProps extends Omit<BaseToast.Provider.Props, 'children' | 'toastManager'> {
  manager: BaseToast.Provider.Props['toastManager']
}

export function SnackbarManager({ manager, ...props }: SnackbarManagerProps) {
  return (
    <BaseToast.Provider limit={1} toastManager={manager} {...props}>
      <SnackbarViewport>
        <SnackbarList />
      </SnackbarViewport>
    </BaseToast.Provider>
  )
}
