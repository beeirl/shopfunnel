import { cn } from '@/lib/utils'
import { Select as BaseSelect } from '@base-ui/react/select'
import type { PhoneNumberBlock as BlockType } from '@shopfunnel/core/funnel/types'
import { IconCheck as CheckIcon, IconChevronDown as ChevronDownIcon } from '@tabler/icons-react'
import * as React from 'react'

const phoneLibPromise = import('libphonenumber-js/min')

type PhoneLib = Awaited<typeof phoneLibPromise>

const flagEmoji = (iso2: string) =>
  String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)))

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
const preferredCountryByDialCode: Record<string, string> = {
  '1': 'US',
  '44': 'GB',
  '358': 'FI',
}

function getDefaultCountry(): string {
  try {
    const region = navigator.language?.split('-')[1]?.toUpperCase()
    if (region && region.length === 2) return region
  } catch {
    // noop
  }
  return 'US'
}

interface CountryItem {
  code: string
  name: string
  dialCode: string
  flag: string
}

function buildCountryList(lib: PhoneLib): CountryItem[] {
  return lib
    .getCountries()
    .map((code) => ({
      code,
      name: displayNames.of(code) ?? code,
      dialCode: lib.getCountryCallingCode(code),
      flag: flagEmoji(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

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
  const [defaultCountry] = React.useState(getDefaultCountry)
  const [phoneLib, setPhoneLib] = React.useState<PhoneLib | null>(null)
  const [country, setCountry] = React.useState(defaultCountry)
  const [displayValue, setDisplayValue] = React.useState('')
  const [value, setValue] = React.useState(props.value ?? '')
  const [countries, setCountries] = React.useState<CountryItem[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    phoneLibPromise.then((lib) => {
      setPhoneLib(lib)
      setCountries(buildCountryList(lib))
    })
  }, [])

  React.useEffect(() => {
    if (!phoneLib) return
    const nextValue = props.value ?? ''
    if (nextValue === value) return

    if (!nextValue) {
      setDisplayValue('')
      setValue('')
      return
    }

    if (!nextValue.startsWith('+')) {
      setDisplayValue(nextValue)
      setValue(nextValue)
      return
    }

    const parsed = phoneLib.parsePhoneNumberFromString(nextValue)
    if (parsed?.country) {
      setCountry(parsed.country)
      const formatter = new phoneLib.AsYouType(parsed.country)
      setDisplayValue(formatter.input(parsed.nationalNumber))
      setValue(parsed.number)
      return
    }

    setDisplayValue(nextValue)
    setValue(nextValue)
  }, [phoneLib, props.value, value])

  const countryCode = country as Parameters<PhoneLib['getCountryCallingCode']>[0]
  const dialCode = phoneLib ? phoneLib.getCountryCallingCode(countryCode) : ''

  const updateValue = (nextValue: string) => {
    setValue(nextValue)
    props.onValueChange?.(nextValue)
  }

  const updateCountryFromInternationalInput = (normalizedRaw: string, detectedCountry?: string) => {
    if (detectedCountry) {
      setCountry(detectedCountry)
      return
    }

    const digits = normalizedRaw.slice(1)
    const matches = countries.filter((country) => digits.startsWith(country.dialCode))
    if (matches.length === 0) return

    const longestDialCodeLength = Math.max(...matches.map((country) => country.dialCode.length))
    const longestMatches = matches.filter((country) => country.dialCode.length === longestDialCodeLength)
    const preferredCountry = preferredCountryByDialCode[longestMatches[0]!.dialCode]
    setCountry(
      longestMatches.find((match) => match.code === country)?.code ??
        longestMatches.find((match) => match.code === defaultCountry)?.code ??
        longestMatches.find((match) => match.code === preferredCountry)?.code ??
        longestMatches[0]!.code,
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!phoneLib) return
    const raw = e.target.value

    if (raw.startsWith('+')) {
      const normalizedRaw = `+${raw.slice(1).replace(/\D/g, '')}`
      const formatter = new phoneLib.AsYouType()
      const formatted = formatter.input(normalizedRaw)
      const phoneNumber = formatter.getNumber()
      updateCountryFromInternationalInput(normalizedRaw, formatter.getCountry() ?? undefined)
      setDisplayValue(formatted)

      updateValue(phoneNumber?.number ?? normalizedRaw)
      return
    }

    const digits = raw.replace(/\D/g, '')
    const formatter = new phoneLib.AsYouType(countryCode)
    const formatted = formatter.input(digits)
    setDisplayValue(formatted)
    const phoneNumber = formatter.getNumber()
    updateValue(phoneNumber?.number ?? (digits ? `+${dialCode}${digits}` : ''))
  }

  const handleCountryChange = (newCountry: string | null) => {
    if (!newCountry || !phoneLib) return
    setCountry(newCountry)
    const digits = displayValue.replace(/\D/g, '')
    const newCountryCode = newCountry as Parameters<PhoneLib['getCountryCallingCode']>[0]
    const formatter = new phoneLib.AsYouType(newCountryCode)
    const formatted = formatter.input(digits)
    setDisplayValue(formatted)
    const phoneNumber = formatter.getNumber()
    updateValue(phoneNumber?.number ?? (digits ? `+${phoneLib.getCountryCallingCode(newCountryCode)}${digits}` : ''))
    inputRef.current?.focus()
  }

  const containerClassName = cn(
    'flex h-14 w-full items-center rounded-(--sf-radius) border-2 text-base transition-all outline-none',
    props.variant === 'soft' && 'border-transparent bg-(--sf-muted) text-(--sf-foreground)',
    props.variant === 'outline' && 'border-(--sf-border) bg-(--sf-background) text-(--sf-foreground)',
    'has-focus-visible:border-(--sf-ring) has-focus-visible:ring-3 has-focus-visible:ring-(--sf-ring)/50',
    props.static && 'pointer-events-none',
  )

  // Before lib loads — render plain input
  if (!phoneLib) {
    return (
      <div className="group-not-data-first/block:mt-6">
        <div className={containerClassName}>
          <input
            className="h-full w-full bg-transparent px-4 text-base outline-none placeholder:text-(--sf-foreground)/50"
            placeholder={props.block.properties.placeholder}
            readOnly
            type="tel"
          />
        </div>
        {showConsent && <ConsentText termsUrl={props.termsUrl} privacyUrl={props.privacyUrl} />}
      </div>
    )
  }

  if (props.static) {
    return (
      <div className="group-not-data-first/block:mt-6">
        <div className={containerClassName}>
          <div className="flex h-full shrink-0 items-center gap-1 pl-3 pr-2 text-base">
            <span className="text-lg leading-none">{flagEmoji(country)}</span>
            <span className="text-(--sf-muted-foreground)">+{dialCode}</span>
            <ChevronDownIcon className="size-4 text-(--sf-muted-foreground)" />
          </div>
          <div className="mx-1 h-6 w-px bg-(--sf-border)" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent pr-4 pl-2 text-base outline-none placeholder:text-(--sf-foreground)/50"
            disabled
            placeholder={props.block.properties.placeholder}
            type="tel"
          />
        </div>
        {showConsent && <ConsentText termsUrl={props.termsUrl} privacyUrl={props.privacyUrl} />}
      </div>
    )
  }

  return (
    <div className="group-not-data-first/block:mt-6">
      <div className={containerClassName}>
        <BaseSelect.Root
          value={country}
          onValueChange={handleCountryChange}
        >
          <BaseSelect.Trigger className="flex h-full shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent pl-3 pr-2 text-base outline-none">
            <span className="text-lg leading-none">{flagEmoji(country)}</span>
            <span className="text-(--sf-muted-foreground)">+{dialCode}</span>
            <BaseSelect.Icon render={<ChevronDownIcon className="size-4 text-(--sf-muted-foreground)" />} />
          </BaseSelect.Trigger>
          <BaseSelect.Portal>
            <BaseSelect.Positioner className="z-50 outline-none" sideOffset={8} align="start" alignItemWithTrigger={false}>
              <BaseSelect.Popup className="max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-(--sf-radius) bg-(--sf-background) p-1 shadow-md ring-2 ring-(--sf-border) transition-[transform,scale,opacity] slide-in-from-top-2 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
                <BaseSelect.List>
                  {countries.map((c) => (
                    <BaseSelect.Item
                      key={c.code}
                      label={c.name}
                      value={c.code}
                      className="grid cursor-default scroll-my-1 grid-cols-[1fr_0.75rem] items-center gap-2 rounded-[calc(var(--sf-radius)-3px)] py-3.5 pr-5 pl-3 leading-4 text-(--sf-foreground) transition-colors outline-none select-none data-highlighted:bg-(--sf-muted)"
                    >
                      <BaseSelect.ItemText className="col-start-1">
                        <span className="mr-2">{c.flag}</span>
                        {c.name}
                        <span className="ml-1 text-(--sf-muted-foreground)">+{c.dialCode}</span>
                      </BaseSelect.ItemText>
                      <BaseSelect.ItemIndicator className="col-start-2">
                        <CheckIcon className="size-5" />
                      </BaseSelect.ItemIndicator>
                    </BaseSelect.Item>
                  ))}
                </BaseSelect.List>
              </BaseSelect.Popup>
            </BaseSelect.Positioner>
          </BaseSelect.Portal>
        </BaseSelect.Root>

        <div className="mx-1 h-6 w-px bg-(--sf-border)" />

        <input
          ref={inputRef}
          autoComplete="tel"
          autoFocus
          className="h-full min-w-0 flex-1 bg-transparent pr-4 pl-2 text-base outline-none placeholder:text-(--sf-foreground)/50"
          inputMode="tel"
          placeholder={props.block.properties.placeholder}
          type="tel"
          value={displayValue}
          onChange={handleInputChange}
        />
      </div>
      {showConsent && <ConsentText termsUrl={props.termsUrl} privacyUrl={props.privacyUrl} />}
    </div>
  )
}

function ConsentText(props: { termsUrl?: string; privacyUrl?: string }) {
  return (
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
      Consent is not required to purchase. Msg & data rates may apply. Msg frequency varies. Reply HELP for help; STOP
      to opt-out.
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
  )
}
