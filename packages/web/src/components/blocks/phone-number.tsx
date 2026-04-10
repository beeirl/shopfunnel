import { cn } from '@/lib/utils'
import { Input as BaseInput } from '@base-ui/react/input'
import type { PhoneNumberBlock as BlockType } from '@shopfunnel/core/funnel/types'

export interface PhoneNumberBlockProps {
  block: BlockType
  privacyUrl?: string
  static?: boolean
  termsUrl?: string
  variant?: 'outline' | 'soft'
  value?: string
  onValueChange?: (value: string) => void
}

export function PhoneNumberBlock(props: PhoneNumberBlockProps) {
  const showConsent = props.block.properties.showConsent

  return (
    <div className="group-not-data-first/block:mt-6">
      <BaseInput
        className={cn(
          'h-14 w-full rounded-(--sf-radius) border-2 border-(--sf-border) px-4 text-base transition-all outline-none placeholder:text-(--sf-foreground)/50',
          props.variant === 'soft' && 'border-transparent bg-(--sf-muted) text-(--sf-foreground)',
          props.variant === 'outline' && 'border-(--sf-border) bg-(--sf-background) text-(--sf-foreground)',
          'focus-visible:border-(--sf-ring) focus-visible:ring-3 focus-visible:ring-(--sf-ring)/50',
          props.static && 'pointer-events-none',
        )}
        autoComplete="tel"
        autoFocus
        disabled={props.static}
        inputMode="tel"
        placeholder={props.block.properties.placeholder}
        type="tel"
        value={props.static ? undefined : (props.value ?? '')}
        onValueChange={props.static ? undefined : props.onValueChange}
      />
      {showConsent && (
        <p className="mt-2 text-center text-xs text-(--sf-muted-foreground)">
          By providing your number and clicking the button, you agree to receive recurring auto-dialed marketing SMS
          (including cart reminders; AI content; artificial or prerecorded voices)
          {props.termsUrl ? (
            <>
              {' '}
              and our{' '}
              <a className="underline" href={props.termsUrl} target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>{' '}
              (including arbitration).
            </>
          ) : (
            '.'
          )}{' '}
          Consent is not required to purchase. Msg & data rates may apply. Msg frequency varies. Reply HELP for help;
          STOP to opt-out.
          {props.privacyUrl && (
            <>
              {' '}
              View{' '}
              <a className="underline" href={props.privacyUrl} target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
              .
            </>
          )}
        </p>
      )}
    </div>
  )
}
