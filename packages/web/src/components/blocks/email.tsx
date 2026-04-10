import { cn } from '@/lib/utils'
import { Input as BaseInput } from '@base-ui/react/input'
import type { EmailBlock as BlockType } from '@shopfunnel/core/funnel/types'

export interface EmailBlockProps {
  block: BlockType
  privacyUrl?: string
  static?: boolean
  termsUrl?: string
  variant?: 'outline' | 'soft'
  value?: string
  onValueChange?: (value: string) => void
}

export function EmailBlock(props: EmailBlockProps) {
  const showConsent = props.block.properties.showConsent

  return (
    <div className="group-not-data-first/block:mt-6">
      <BaseInput
        className={cn(
          // Base
          'h-14 w-full rounded-(--sf-radius) border-2 border-(--sf-border) px-4 text-base transition-all outline-none placeholder:text-(--sf-foreground)/50',
          // Variant
          props.variant === 'soft' && 'border-transparent bg-(--sf-muted) text-(--sf-foreground)',
          props.variant === 'outline' && 'border-(--sf-border) bg-(--sf-background) text-(--sf-foreground)',
          // Focus
          'focus-visible:border-(--sf-ring) focus-visible:ring-3 focus-visible:ring-(--sf-ring)/50',
          props.static && 'pointer-events-none',
        )}
        autoFocus
        disabled={props.static}
        placeholder={props.block.properties.placeholder}
        type="email"
        value={props.static ? undefined : (props.value ?? '')}
        onValueChange={props.static ? undefined : props.onValueChange}
      />
      {showConsent && (
        <p className="mt-2 text-center text-xs text-(--sf-muted-foreground)">
          By entering your email, you agree to receive marketing emails. You can unsubscribe at any time using the link
          in our emails.
          {(props.termsUrl || props.privacyUrl) && (
            <>
              {' '}
              See our{' '}
              {props.termsUrl && (
                <a className="underline" href={props.termsUrl} target="_blank" rel="noopener noreferrer">
                  Terms
                </a>
              )}
              {props.termsUrl && props.privacyUrl && ' & '}
              {props.privacyUrl && (
                <a className="underline" href={props.privacyUrl} target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
              )}
              .
            </>
          )}
        </p>
      )}
    </div>
  )
}
