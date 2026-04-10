interface ConsentTextProps {
  privacyUrl?: string
  termsUrl?: string
}

function ConsentLink({ href, children }: { href: string; children: string }) {
  return (
    <a className="underline" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export function EmailConsentText({ privacyUrl, termsUrl }: ConsentTextProps) {
  return (
    <p className="mt-2 text-center text-xs text-(--sf-muted-foreground)">
      By entering your email, you agree to receive marketing emails. You can unsubscribe at any time using the link in
      our emails.
      {(termsUrl || privacyUrl) && (
        <>
          {' '}
          See our {termsUrl && <ConsentLink href={termsUrl}>Terms</ConsentLink>}
          {termsUrl && privacyUrl && ' & '}
          {privacyUrl && <ConsentLink href={privacyUrl}>Privacy Policy</ConsentLink>}.
        </>
      )}
    </p>
  )
}

export function PhoneConsentText({ privacyUrl, termsUrl }: ConsentTextProps) {
  return (
    <p className="mt-2 text-center text-xs text-(--sf-muted-foreground)">
      By providing your number and clicking the button, you agree to receive recurring auto-dialed marketing SMS
      (including cart reminders; AI content; artificial or prerecorded voices)
      {termsUrl ? (
        <>
          {' '}
          and our <ConsentLink href={termsUrl}>Terms of Service</ConsentLink> (including arbitration).
        </>
      ) : (
        '.'
      )}{' '}
      Consent is not required to purchase. Msg & data rates may apply. Msg frequency varies. Reply HELP for help; STOP
      to opt-out.
      {privacyUrl && (
        <>
          {' '}
          View <ConsentLink href={privacyUrl}>Privacy Policy</ConsentLink>.
        </>
      )}
    </p>
  )
}
