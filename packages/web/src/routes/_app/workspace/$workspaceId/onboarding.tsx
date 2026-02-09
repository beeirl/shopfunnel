import { Icon } from '@/components/icon'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { withActor } from '@/context/auth.withActor'
import { cn } from '@/lib/utils'
import { Identifier } from '@shopfunnel/core/identifier'
import { Workspace } from '@shopfunnel/core/workspace/index'
import type { WorkspaceSurvey } from '@shopfunnel/core/workspace/index.sql'
import {
  IconBrain as BrainIcon,
  IconCode as CodeIcon,
  IconDots as DotsIcon,
  IconDownload as DownloadIcon,
  IconBrandLinkedin as LinkedinIcon,
  IconMail as MailIcon,
  IconMicrophone as MicrophoneIcon,
  IconPackage as PackageIcon,
  IconUsers as UsersIcon,
} from '@tabler/icons-react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'
import { z } from 'zod'
import { getWorkspaceFlags } from './-common'
import { BillingPage } from './-components/billing-page'

const completeOnboarding = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      survey: z.custom<WorkspaceSurvey>(),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Workspace.completeOnboarding(data.survey), data.workspaceId)
  })

export const Route = createFileRoute('/_app/workspace/$workspaceId/onboarding')({
  component: RouteComponent,
  beforeLoad: async ({ params }) => {
    const flags = await getWorkspaceFlags({ data: params.workspaceId })
    if (flags.onboardingCompleted) throw redirect({ to: '..' })
  },
})

const TOTAL_STEPS = 7
const AUTO_ADVANCE_DELAY = 600

const PLATFORM_OPTIONS: {
  value: NonNullable<WorkspaceSurvey['shopPlatform']>
  label: string
  icon: React.ReactNode
}[] = [
  { value: 'shopify', label: 'Shopify', icon: <Icon name="shopify" /> },
  { value: 'woocommerce', label: 'WooCommerce', icon: <Icon name="woocommerce" /> },
  { value: 'bigcommerce', label: 'BigCommerce', icon: <Icon name="bigcommerce" /> },
  { value: 'magento', label: 'Magento', icon: <Icon name="magento" /> },
  { value: 'squarespace', label: 'Squarespace', icon: <Icon name="squarespace" /> },
  { value: 'wix', label: 'Wix', icon: <Icon name="wix" /> },
  { value: 'custom', label: 'Custom', icon: <CodeIcon /> },
  { value: 'other', label: 'Other', icon: <DotsIcon /> },
]

const PRODUCT_OPTIONS: {
  value: NonNullable<WorkspaceSurvey['productCategory']>
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: 'physical',
    label: 'Physical Products',
    description: 'Tangible goods shipped to customers',
    icon: <PackageIcon />,
  },
  {
    value: 'digital',
    label: 'Digital Products',
    description: 'Downloads, courses, software, etc.',
    icon: <DownloadIcon />,
  },
]

const VISITOR_OPTIONS: { value: NonNullable<WorkspaceSurvey['monthlyVisitors']>; label: string }[] = [
  { value: '0-25k', label: '0 - 25K' },
  { value: '25k-50k', label: '25K - 50K' },
  { value: '50k-100k', label: '50K - 100K' },
  { value: '100k-250k', label: '100K - 250K' },
  { value: '250k-500k', label: '250K - 500K' },
  { value: '500k-1m', label: '500K - 1M' },
  { value: '1m+', label: '1M+' },
  { value: 'none', label: 'Just starting out' },
]

const REFERRAL_OPTIONS: {
  value: NonNullable<WorkspaceSurvey['referralSource']>
  label: string
  icon: React.ReactNode
}[] = [
  { value: 'x', label: 'X (Twitter)', icon: <Icon name="x" /> },
  { value: 'youtube', label: 'YouTube', icon: <Icon name="youtube" /> },
  { value: 'tiktok', label: 'TikTok', icon: <Icon name="tiktok" /> },
  { value: 'instagram', label: 'Instagram', icon: <Icon name="instagram" /> },
  { value: 'google', label: 'Google', icon: <Icon name="google" /> },
  { value: 'email_or_newsletter', label: 'Email', icon: <MailIcon /> },
  { value: 'friends', label: 'Friends', icon: <UsersIcon /> },
  { value: 'facebook', label: 'Facebook', icon: <Icon name="facebook" /> },
  { value: 'linkedin', label: 'LinkedIn', icon: <LinkedinIcon /> },
  { value: 'podcast', label: 'Podcast', icon: <MicrophoneIcon /> },
  { value: 'ai', label: 'ChatGPT, Claude, etc.', icon: <BrainIcon /> },
  { value: 'other', label: 'Other', icon: <DotsIcon /> },
]

function cardClassName(selected: boolean) {
  return cn(
    'flex w-full items-start gap-2 border text-left transition duration-200 outline-none sm:gap-4',
    'rounded-t-[18px] rounded-b-[16px]',
    'hover:border-foreground focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2',
    selected ? 'border-foreground' : 'border-border',
  )
}

function StepHeader({ title }: { title: string }) {
  return (
    <div className="py-4 pb-3 sm:pb-5">
      <span className="text-left text-lg font-bold text-foreground md:text-2xl">{title}</span>
    </div>
  )
}

function IntroStep({ onComplete }: { onComplete: () => void }) {
  const wordmarkRef = React.useRef<HTMLDivElement>(null)
  const [wordmarkWidth, setWordmarkWidth] = React.useState(0)
  const [showWordmark, setShowWordmark] = React.useState(false)

  React.useEffect(() => {
    if (wordmarkRef.current) {
      setWordmarkWidth(wordmarkRef.current.scrollWidth)
    }
  }, [])

  React.useEffect(() => {
    const timers = [setTimeout(() => setShowWordmark(true), 1200), setTimeout(onComplete, 2500)]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center">
        <div>
          <svg viewBox="0 0 16.1 19" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto sm:h-8">
            <motion.path
              d="M0 0.350502H16.1V3.27778H0L0 0.350502Z"
              fill="currentColor"
              initial={{ opacity: 0, scaleX: 0, y: 4 }}
              animate={{ opacity: 1, scaleX: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0 }}
              style={{ originX: '50%', originY: '50%' }}
            />
            <motion.path
              d="M1.82954 6.20506H14.2704V9.13234H1.82954V6.20506Z"
              fill="currentColor"
              initial={{ opacity: 0, scaleX: 0, y: 4 }}
              animate={{ opacity: 1, scaleX: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.15 }}
              style={{ originX: '50%', originY: '50%' }}
            />
            <motion.path
              d="M4.75683 12.0596H11.3432V14.9869H4.75683V12.0596Z"
              fill="currentColor"
              initial={{ opacity: 0, scaleX: 0, y: 4 }}
              animate={{ opacity: 1, scaleX: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.3 }}
              style={{ originX: '50%', originY: '50%' }}
            />
          </svg>
        </div>

        <motion.div
          className="overflow-hidden"
          initial={{ width: 0, opacity: 0 }}
          animate={showWordmark ? { width: wordmarkWidth, opacity: 1 } : { width: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <div ref={wordmarkRef} className="pl-2 whitespace-nowrap">
            <svg viewBox="22.5 0 104.5 19" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto sm:h-8">
              <path d="M123.585 14.9855V0.348503H126.475V14.9855H123.585Z" fill="currentColor" />
              <path
                d="M116.946 15.2315C115.279 15.2315 114.021 14.7668 113.174 13.8375C112.327 12.9082 111.903 11.4595 111.903 9.4915C111.903 7.55084 112.347 6.11584 113.236 5.1865C114.124 4.2435 115.374 3.772 116.987 3.772C118.6 3.772 119.809 4.23667 120.616 5.166C121.436 6.08167 121.846 7.53717 121.846 9.5325V10.1065H114.753C114.807 11.2682 115.012 12.1018 115.368 12.6075C115.723 13.1132 116.249 13.366 116.946 13.366C117.493 13.366 117.923 13.2157 118.238 12.915C118.566 12.6143 118.764 12.1838 118.832 11.6235H121.723C121.627 12.7988 121.142 13.694 120.267 14.309C119.392 14.924 118.285 15.2315 116.946 15.2315ZM114.773 8.364H118.996C118.928 7.38 118.723 6.67617 118.381 6.2525C118.053 5.82884 117.575 5.617 116.946 5.617C115.689 5.617 114.964 6.53267 114.773 8.364Z"
                fill="currentColor"
              />
              <path
                d="M107.325 7.9335C107.325 6.55317 106.778 5.863 105.685 5.863C105.042 5.863 104.53 6.09534 104.147 6.56C103.778 7.02467 103.594 7.68067 103.594 8.528V14.9855H100.703V5.8425L100.662 4.018H103.532L103.594 5.4325H103.655C103.929 4.9405 104.332 4.54417 104.865 4.2435C105.398 3.92917 106.006 3.772 106.689 3.772C107.783 3.772 108.644 4.08634 109.272 4.715C109.901 5.33 110.215 6.2525 110.215 7.4825V14.9855H107.325V7.9335Z"
                fill="currentColor"
              />
              <path
                d="M95.6533 7.9335C95.6533 6.55317 95.1066 5.863 94.0133 5.863C93.371 5.863 92.8585 6.09534 92.4758 6.56C92.1068 7.02467 91.9223 7.68067 91.9223 8.528V14.9855H89.0318V5.8425L88.9908 4.018H91.8608L91.9223 5.4325H91.9838C92.2571 4.9405 92.6603 4.54417 93.1933 4.2435C93.7263 3.92917 94.3345 3.772 95.0178 3.772C96.1111 3.772 96.9721 4.08634 97.6008 4.715C98.2295 5.33 98.5438 6.2525 98.5438 7.4825V14.9855H95.6533V7.9335Z"
                fill="currentColor"
              />
              <path
                d="M80.8425 15.2315C79.7355 15.2315 78.8814 14.924 78.28 14.309C77.6924 13.6803 77.3985 12.7442 77.3985 11.5005V4.01801H80.289V10.988C80.289 12.423 80.8015 13.1405 81.8265 13.1405C82.4552 13.1405 82.954 12.9082 83.323 12.4435C83.692 11.9788 83.8765 11.2955 83.8765 10.3935V4.01801H86.7875V13.243L86.808 14.9855H83.938L83.8765 13.571H83.815C83.5554 14.0767 83.1659 14.4798 82.6465 14.7805C82.1409 15.0812 81.5395 15.2315 80.8425 15.2315Z"
                fill="currentColor"
              />
              <path
                d="M71.1516 3.2185C71.1516 2.20717 71.4045 1.476 71.9101 1.025C72.4295 0.574003 73.2426 0.348503 74.3496 0.348503H76.1536V2.296H74.9441C74.3428 2.296 74.0421 2.6035 74.0421 3.2185V4.018H75.9486V6.0065H74.0421V14.9855H71.1516V6.0065H69.6346V4.018H71.1516V3.2185Z"
                fill="currentColor"
              />
              <path
                d="M58.5826 18.655V6.683L58.5211 4.018H61.3911L61.4526 5.3095H61.4731C61.7191 4.8585 62.1017 4.4895 62.6211 4.2025C63.1541 3.9155 63.7281 3.772 64.3431 3.772C65.6961 3.772 66.7552 4.2435 67.5206 5.1865C68.2996 6.11584 68.6891 7.55767 68.6891 9.512C68.6891 11.48 68.2791 12.9287 67.4591 13.858C66.6391 14.7737 65.5731 15.2315 64.2611 15.2315C63.6597 15.2315 63.1062 15.0948 62.6006 14.8215C62.0949 14.5482 61.7259 14.2065 61.4936 13.7965H61.4731V18.655H58.5826ZM63.5231 13.079C65.0264 13.079 65.7781 11.89 65.7781 9.512C65.7781 7.12034 65.0264 5.9245 63.5231 5.9245C62.0471 5.9245 61.3091 7.12034 61.3091 9.512C61.3091 11.89 62.0471 13.079 63.5231 13.079Z"
                fill="currentColor"
              />
              <path
                d="M51.6643 15.2315C48.2476 15.2315 46.5393 13.3182 46.5393 9.4915C46.5393 5.6785 48.2476 3.772 51.6643 3.772C55.0673 3.772 56.7688 5.6785 56.7688 9.4915C56.7688 11.4322 56.3246 12.874 55.4363 13.817C54.5616 14.76 53.3043 15.2315 51.6643 15.2315ZM51.6643 13.284C52.4023 13.284 52.9558 12.9902 53.3248 12.4025C53.6938 11.8012 53.8783 10.8308 53.8783 9.4915C53.8783 8.15217 53.6938 7.18867 53.3248 6.601C52.9558 6.01334 52.4023 5.7195 51.6643 5.7195C50.9126 5.7195 50.3523 6.01334 49.9833 6.601C49.628 7.175 49.4503 8.1385 49.4503 9.4915C49.4503 10.8445 49.628 11.8148 49.9833 12.4025C50.3523 12.9902 50.9126 13.284 51.6643 13.284Z"
                fill="currentColor"
              />
              <path
                d="M35.3184 14.9855V0.348503H38.2089V5.4325H38.2704C38.5301 4.9405 38.9333 4.54417 39.4799 4.2435C40.0266 3.92917 40.6416 3.772 41.3249 3.772C42.4046 3.772 43.2588 4.08634 43.8874 4.715C44.5161 5.33 44.8304 6.2525 44.8304 7.4825V14.9855H41.9399V7.9335C41.9399 6.55317 41.4001 5.863 40.3204 5.863C39.6644 5.863 39.1451 6.09534 38.7624 6.56C38.3934 7.02467 38.2089 7.68067 38.2089 8.528V14.9855H35.3184Z"
                fill="currentColor"
              />
              <path
                d="M27.986 15.334C24.3917 15.334 22.5672 13.7623 22.5125 10.619H25.567C25.649 12.341 26.4963 13.202 28.109 13.202C28.8607 13.202 29.4552 13.0175 29.8925 12.6485C30.3435 12.2795 30.569 11.7807 30.569 11.152C30.569 10.5507 30.3913 10.1133 30.036 9.84C29.6943 9.553 29.134 9.307 28.355 9.102L26.9815 8.7535C25.5465 8.39817 24.4805 7.89933 23.7835 7.257C23.1002 6.601 22.7585 5.6785 22.7585 4.4895C22.7585 3.12283 23.2642 2.03633 24.2755 1.23C25.2868 0.41 26.5783 0 28.15 0C29.7627 0 31.0268 0.3485 31.9425 1.0455C32.8718 1.7425 33.3638 2.82217 33.4185 4.2845H30.364C30.241 2.8495 29.4757 2.132 28.068 2.132C27.3573 2.132 26.8038 2.30967 26.4075 2.665C26.0248 3.00667 25.8335 3.485 25.8335 4.1C25.8335 5.02933 26.4895 5.65117 27.8015 5.9655L29.175 6.314C30.733 6.71033 31.8742 7.216 32.5985 7.831C33.3228 8.446 33.685 9.40267 33.685 10.701C33.685 12.136 33.1452 13.2703 32.0655 14.104C30.9858 14.924 29.626 15.334 27.986 15.334Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function StepIndicator({
  current,
  total,
  onGoToStep,
}: {
  current: number
  total: number
  onGoToStep: (step: number) => void
}) {
  return (
    <div className="flex items-center justify-center">
      {Array.from({ length: total }, (_, i) => {
        const isPast = i < current
        const isCurrent = i === current
        return (
          <button
            key={i}
            type="button"
            aria-label={`Go to step ${i + 1}`}
            aria-disabled={!isPast}
            disabled={!isPast}
            onClick={() => isPast && onGoToStep(i)}
            className={cn('group px-1 py-1', isPast ? 'cursor-pointer' : 'cursor-default')}
          >
            <div
              className={cn(
                'rounded-full bg-foreground transition-all duration-200',
                isPast && 'group-hover:scale-150',
              )}
              style={{
                width: isCurrent ? 20 : 6,
                height: 6,
                opacity: isCurrent ? 1 : 0.3,
              }}
            />
          </button>
        )
      })}
    </div>
  )
}

function ShopUrlStep({
  value,
  onValueChange,
  onNext,
}: {
  value?: string
  onValueChange: (v: string) => void
  onNext: () => void
}) {
  const [error, setError] = React.useState<string | null>(null)

  function handleNext() {
    const trimmed = (value ?? '').trim()
    if (!trimmed) {
      setError('Required')
      return
    }

    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      const url = new URL(normalized)
      if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname.includes('.')) {
        setError('Please enter a valid URL')
        return
      }
    } catch {
      setError('Please enter a valid URL')
      return
    }

    onValueChange(normalized)
    onNext()
  }

  function handleValueChange(v: string) {
    if (error) setError(null)
    onValueChange(v)
  }

  return (
    <form
      className="w-full max-w-lg"
      onSubmit={(e) => {
        e.preventDefault()
        handleNext()
      }}
    >
      <StepHeader title="What's your store URL?" />
      <Field.Root data-invalid={!!error}>
        <Input autoFocus placeholder="https://mystore.com" value={value ?? ''} onValueChange={handleValueChange} />
        <Field.Error>{error}</Field.Error>
      </Field.Root>
      <div className="flex min-h-20 items-center gap-2 py-6">
        <Button type="submit">Next</Button>
      </div>
    </form>
  )
}

function PlatformStep({
  value,
  onValueChange,
  onBack,
  onSkip,
  isTransitioning,
}: {
  value?: WorkspaceSurvey['shopPlatform']
  onValueChange: (v: NonNullable<WorkspaceSurvey['shopPlatform']>) => void
  onBack: () => void
  onSkip: () => void
  isTransitioning: boolean
}) {
  return (
    <div className="w-full max-w-3xl">
      <StepHeader title="What platform is your store built on?" />
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        {PLATFORM_OPTIONS.map((option, index) => (
          <motion.div
            key={option.value}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{
              opacity: isTransitioning && value !== option.value ? 0 : 1,
              scale: isTransitioning && value !== option.value ? 1 : 1,
            }}
            transition={{
              duration: isTransitioning ? 0.3 : 0.35,
              delay: isTransitioning ? 0 : index * 0.06,
            }}
          >
            <button
              type="button"
              aria-selected={value === option.value}
              onClick={() => onValueChange(option.value)}
              className={cn(cardClassName(value === option.value), 'h-18 px-3.5 pt-3.5 sm:h-22.5 sm:px-5 sm:pt-4.5')}
            >
              {React.cloneElement(option.icon as React.ReactElement<{ className?: string }>, {
                className: 'size-4.5 shrink-0',
              })}
              <p className="text-sm font-medium text-foreground">{option.label}</p>
            </button>
          </motion.div>
        ))}
      </div>
      <motion.div
        className="flex min-h-20 items-center gap-2 py-6"
        animate={{ opacity: isTransitioning ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </motion.div>
    </div>
  )
}

function ProductCategoryStep({
  value,
  onValueChange,
  onBack,
  onSkip,
  isTransitioning,
}: {
  value?: WorkspaceSurvey['productCategory']
  onValueChange: (v: NonNullable<WorkspaceSurvey['productCategory']>) => void
  onBack: () => void
  onSkip: () => void
  isTransitioning: boolean
}) {
  return (
    <div className="w-full max-w-2xl">
      <StepHeader title="What type of products do you sell?" />
      <div className="grid grid-cols-2 gap-2">
        {PRODUCT_OPTIONS.map((option, index) => (
          <motion.div
            key={option.value}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{
              opacity: isTransitioning && value !== option.value ? 0 : 1,
              scale: isTransitioning && value !== option.value ? 1 : 1,
            }}
            transition={{
              duration: isTransitioning ? 0.3 : 0.35,
              delay: isTransitioning ? 0 : index * 0.06,
            }}
          >
            <button
              type="button"
              aria-selected={value === option.value}
              onClick={() => onValueChange(option.value)}
              className={cn(
                cardClassName(value === option.value),
                'flex-col gap-0 px-3.5 pt-3.5 sm:px-5 sm:pt-4.5 sm:pb-4',
              )}
            >
              {React.cloneElement(option.icon as React.ReactElement<{ className?: string }>, {
                className: 'size-4.5 shrink-0',
              })}
              <div className="mt-2">
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </button>
          </motion.div>
        ))}
      </div>
      <motion.div
        className="flex min-h-20 items-center gap-2 py-6"
        animate={{ opacity: isTransitioning ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </motion.div>
    </div>
  )
}

function MonthlyVisitorsStep({
  value,
  onValueChange,
  onBack,
  onSkip,
  isTransitioning,
}: {
  value?: WorkspaceSurvey['monthlyVisitors']
  onValueChange: (v: NonNullable<WorkspaceSurvey['monthlyVisitors']>) => void
  onBack: () => void
  onSkip: () => void
  isTransitioning: boolean
}) {
  return (
    <div className="w-full max-w-3xl">
      <StepHeader title="How many monthly visitors does your store get?" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {VISITOR_OPTIONS.map((option, index) => (
          <motion.div
            key={option.value}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{
              opacity: isTransitioning && value !== option.value ? 0 : 1,
              scale: isTransitioning && value !== option.value ? 1 : 1,
            }}
            transition={{
              duration: isTransitioning ? 0.3 : 0.35,
              delay: isTransitioning ? 0 : index * 0.06,
            }}
          >
            <button
              type="button"
              aria-selected={value === option.value}
              onClick={() => onValueChange(option.value)}
              className={cn(
                cardClassName(value === option.value),
                'h-18 items-center justify-center px-3.5 sm:h-22.5 sm:px-5',
              )}
            >
              <p className="text-sm font-medium text-foreground">{option.label}</p>
            </button>
          </motion.div>
        ))}
      </div>
      <motion.div
        className="flex min-h-20 items-center gap-2 py-6"
        animate={{ opacity: isTransitioning ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </motion.div>
    </div>
  )
}

function ReferralSourceStep({
  value,
  onValueChange,
  onBack,
  onSkip,
  isTransitioning,
}: {
  value?: WorkspaceSurvey['referralSource']
  onValueChange: (v: NonNullable<WorkspaceSurvey['referralSource']>) => void
  onBack: () => void
  onSkip: () => void
  isTransitioning: boolean
}) {
  return (
    <div className="w-full max-w-3xl">
      <StepHeader title="How did you hear about us?" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {REFERRAL_OPTIONS.map((option, index) => (
          <motion.div
            key={option.value}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{
              opacity: isTransitioning && value !== option.value ? 0 : 1,
              scale: isTransitioning && value !== option.value ? 1 : 1,
            }}
            transition={{
              duration: isTransitioning ? 0.3 : 0.35,
              delay: isTransitioning ? 0 : index * 0.06,
            }}
          >
            <button
              type="button"
              aria-selected={value === option.value}
              onClick={() => onValueChange(option.value)}
              className={cn(cardClassName(value === option.value), 'h-18 px-3.5 pt-3.5 sm:h-22.5 sm:px-5 sm:pt-4.5')}
            >
              {React.cloneElement(option.icon as React.ReactElement<{ className?: string }>, {
                className: 'size-4.5 shrink-0',
              })}
              <p className="text-sm font-medium text-foreground">{option.label}</p>
            </button>
          </motion.div>
        ))}
      </div>
      <motion.div
        className="flex min-h-20 items-center gap-2 py-6"
        animate={{ opacity: isTransitioning ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </motion.div>
    </div>
  )
}

function RouteComponent() {
  const params = Route.useParams()
  const [step, setStep] = React.useState(0)
  const [survey, setSurvey] = React.useState<WorkspaceSurvey>({})
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const autoAdvanceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    }
  }, [])

  function scheduleAutoAdvance() {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    setIsTransitioning(true)
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = null
      setIsTransitioning(false)
      setStep((s) => (s < TOTAL_STEPS - 1 ? s + 1 : s))
    }, AUTO_ADVANCE_DELAY)
  }

  function updateSurveyAndAutoAdvance<K extends keyof WorkspaceSurvey>(key: K, value: WorkspaceSurvey[K]) {
    setSurvey((prev) => ({ ...prev, [key]: value }))
    scheduleAutoAdvance()
  }

  function updateSurvey<K extends keyof WorkspaceSurvey>(key: K, value: WorkspaceSurvey[K]) {
    setSurvey((prev) => ({ ...prev, [key]: value }))
  }

  function handleNext() {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    setIsTransitioning(false)
    if (step < TOTAL_STEPS - 1) setStep(step + 1)
  }

  React.useEffect(() => {
    if (step === TOTAL_STEPS - 1) {
      completeOnboarding({
        data: {
          workspaceId: params.workspaceId,
          survey,
        },
      })
    }
  }, [step])

  function handleBack() {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    setIsTransitioning(false)
    if (step > 0) setStep(step - 1)
  }

  function handleGoToStep(targetStep: number) {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    setIsTransitioning(false)
    if (targetStep < step) setStep(targetStep)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className={cn('flex flex-1 flex-col items-center justify-center px-4', step > 0 && 'pb-18 md:pb-28')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 ? (
            <IntroStep onComplete={handleNext} />
          ) : step === 1 ? (
            <ShopUrlStep value={survey.shopUrl} onValueChange={(v) => updateSurvey('shopUrl', v)} onNext={handleNext} />
          ) : step === 2 ? (
            <PlatformStep
              value={survey.shopPlatform}
              onValueChange={(v) => updateSurveyAndAutoAdvance('shopPlatform', v)}
              onBack={handleBack}
              onSkip={handleNext}
              isTransitioning={isTransitioning}
            />
          ) : step === 3 ? (
            <ProductCategoryStep
              value={survey.productCategory}
              onValueChange={(v) => updateSurveyAndAutoAdvance('productCategory', v)}
              onBack={handleBack}
              onSkip={handleNext}
              isTransitioning={isTransitioning}
            />
          ) : step === 4 ? (
            <MonthlyVisitorsStep
              value={survey.monthlyVisitors}
              onValueChange={(v) => updateSurveyAndAutoAdvance('monthlyVisitors', v)}
              onBack={handleBack}
              onSkip={handleNext}
              isTransitioning={isTransitioning}
            />
          ) : step === 5 ? (
            <ReferralSourceStep
              value={survey.referralSource}
              onValueChange={(v) => updateSurveyAndAutoAdvance('referralSource', v)}
              onBack={handleBack}
              onSkip={handleNext}
              isTransitioning={isTransitioning}
            />
          ) : (
            <BillingPage animate title="One last step" subtitle="Select a plan based on your needs" />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {step > 0 && (
          <motion.div
            key="step-indicator"
            className="fixed inset-x-0 bottom-0 py-5 md:py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2, delay: 0 } }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <StepIndicator current={step - 1} total={TOTAL_STEPS - 1} onGoToStep={(s) => handleGoToStep(s + 1)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
