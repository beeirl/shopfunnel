import ShopfunnelLogo from '@/assets/shopfunnel-logo.svg?react'
import { cn } from '@/lib/utils'
import {
  IconArrowUpRight as ArrowUpRightIcon,
  IconCircleChevronRightFilled as ChevronRightCircleIcon,
  IconMail as MailIcon,
} from '@tabler/icons-react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { PostHogProvider, usePostHog } from 'posthog-js/react'
import * as React from 'react'
import { getLastSeenWorkspaceId } from '../-common'

const checkAuth = createServerFn().handler(async () => {
  const workspaceId = await getLastSeenWorkspaceId().catch(() => undefined)
  if (workspaceId) throw redirect({ to: '/workspace/$workspaceId', params: { workspaceId } })
})

export const Route = createFileRoute('/_app/')({
  component: RouteComponent,
  head: () => ({
    meta: [
      { title: 'Shopfunnel - Quiz Funnels for Ecommerce Brands' },
      {
        name: 'description',
        content:
          'We build high converting mobile-first quiz funnels for ecommerce brands. Get a free quiz funnel to test, built by us. Proven results generating over $1M/month.',
      },
    ],
  }),
  beforeLoad: async () => {
    await checkAuth()
  },
})

function Heading({ level, className, children, ...props }: React.ComponentProps<'h1'> & { level: 1 | 2 }) {
  const Comp = level === 1 ? 'h1' : 'h2'
  return (
    <Comp className={cn('text-2xl font-semibold', className)} {...props}>
      {children}
    </Comp>
  )
}

function Text({ className, children, ...props }: React.ComponentProps<'p'>) {
  return (
    <p className={cn('text-muted-foreground', className)} {...props}>
      {children}
    </p>
  )
}

function Section({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('space-y-3', className)} {...props} />
}

function Image({
  src,
  alt,
  style,
  className,
  ...props
}: React.ComponentProps<'img'> & { style?: React.CSSProperties }) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-xl shadow-xs', className)}
      style={{
        aspectRatio: '3 / 3.7',
        background:
          'radial-gradient(circle at 20% 80%, rgba(115, 115, 115, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(229, 229, 229, 0.3), transparent 50%), radial-gradient(circle at 40% 40%, rgba(163, 163, 163, 0.2), transparent 60%), linear-gradient(135deg, rgb(245, 245, 245), rgb(229, 229, 229))',
        ...style,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10 size-full rounded-xl"
        style={{ backdropFilter: 'blur(100px)' }}
      />
      <div className="pointer-events-none absolute inset-0 z-30 size-full rounded-xl ring-1 ring-black/10 ring-inset" />
      <div className="absolute inset-x-0 top-0 z-20 flex w-full justify-center p-4 sm:p-6">
        <div className="h-full w-full overflow-hidden rounded-xl bg-white/50 px-1.5 pb-1.5 shadow-lg ring-1 ring-gray-500/10 backdrop-blur-xl">
          <div className="flex items-center py-2">
            <div className="flex items-center gap-1 px-1">
              <div className="size-2 rounded-full border border-gray-950/10 bg-gray-100/30 transition-colors hover:bg-red-500" />
              <div className="size-2 rounded-full border border-gray-950/10 bg-gray-100/30 transition-colors hover:bg-yellow-500" />
              <div className="size-2 rounded-full border border-gray-950/10 bg-gray-100/30 transition-colors hover:bg-green-500" />
            </div>
          </div>
          <img
            src={src}
            alt={alt}
            className="h-auto w-full max-w-full rounded-lg shadow-xs ring-1 ring-gray-500/10"
            loading="lazy"
            {...props}
          />
        </div>
      </div>
    </div>
  )
}

function Button({
  size = 'default',
  variant = 'default',
  className,
  children,
  ...props
}: Omit<React.ComponentProps<'a'>, 'size'> & { size?: 'default' | 'sm'; variant?: 'default' | 'secondary' }) {
  return (
    <a
      data-slot="button"
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border bg-clip-padding font-medium whitespace-nowrap transition-shadow outline-none',
        'before:pointer-events-none before:absolute before:inset-0',
        'pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0',
        '[:active,[data-pressed]]:inset-shadow-[0_1px_--theme(--color-black/8%)]',
        '[:active,[data-pressed]]:shadow-none',
        variant === 'default' && [
          'focus-visible:ring-3 focus-visible:ring-primary/30',
          'inset-shadow-[0_1px_--theme(--color-white/16%)]',
          'border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/24',
          'hover:bg-primary/90',
        ],
        variant === 'secondary' && [
          'focus-visible:ring-3 focus-visible:ring-secondary/30',
          'border-secondary bg-secondary text-secondary-foreground shadow-xs shadow-secondary/24',
          'hover:bg-secondary/80',
        ],
        size === 'default' && [
          'min-h-10 px-[calc(--spacing(4)-1px)] py-[calc(--spacing(2)-1px)] text-base',
          "[&_svg:not([class*='size-'])]:size-4.5",
        ],
        size === 'sm' && [
          'min-h-8 px-[calc(--spacing(3)-1px)] py-[calc(--spacing(1.5)-1px)] text-sm',
          "[&_svg:not([class*='size-'])]:size-4",
        ],
        className,
      )}
      {...props}
    >
      {children}
    </a>
  )
}

const CALENDLY_URL = 'https://calendly.com/kai-shopfunnel/30min'

function RouteComponent() {
  if (import.meta.env.VITE_DEV) {
    return <RouteComponentInner />
  }

  return (
    <PostHogProvider
      apiKey={import.meta.env.VITE_POSTHOG_API_KEY!}
      options={{
        api_host: 'https://us.i.posthog.com',
        autocapture: false,
        capture_exceptions: true,
      }}
    >
      <RouteComponentInner />
    </PostHogProvider>
  )
}

function RouteComponentInner() {
  const posthog = usePostHog()
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <div
        className={`fixed inset-x-0 top-0 z-50 border-b border-border bg-background transition-transform duration-300 ${scrolled ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <p className="max-sm:text-sm max-sm:text-balance">Get a free quiz funnel to test, built by us</p>
          <Button
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            onClick={() => posthog?.capture('Book Call Button Clicked')}
          >
            Book a Call
            <ChevronRightCircleIcon />
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6">
        <header className="flex items-center justify-between bg-background pt-5 pb-2">
          <ShopfunnelLogo className="h-4.5 w-auto text-foreground" />
          <Button href="/auth" size="sm" variant="secondary" onClick={() => posthog?.capture('Sign In Button Clicked')}>
            Sign In
          </Button>
        </header>

        <main className="space-y-16 pt-12 pb-24">
          <Section>
            <Heading level={1}>Get a free quiz funnel to test, built by us.</Heading>
            <Text>We build high converting mobile-first quiz funnels for ecommerce brands.</Text>
            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
              <Image
                src="/obvi.png"
                alt="Obvi quiz funnel"
                style={{
                  background:
                    'radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.3), transparent 50%), radial-gradient(circle at 40% 40%, rgba(192, 132, 252, 0.2), transparent 60%), linear-gradient(135deg, rgb(250, 245, 255), rgb(253, 242, 248))',
                }}
              />
              <Image
                src="/primalqueen.png"
                alt="Primal Queen quiz funnel"
                style={{
                  background:
                    'radial-gradient(circle at 20% 80%, rgba(225, 29, 72, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(251, 113, 133, 0.3), transparent 50%), radial-gradient(circle at 40% 40%, rgba(244, 63, 94, 0.2), transparent 60%), linear-gradient(135deg, rgb(255, 241, 242), rgb(254, 226, 226))',
                }}
              />
            </div>
            <Button
              className="mt-4"
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => posthog?.capture('Book Call Button Clicked')}
            >
              Book a Call
              <ChevronRightCircleIcon />
            </Button>
          </Section>

          <Section>
            <Heading level={2}>Why a quiz funnel...</Heading>
            <Text>
              Sending cold traffic straight to a product page, forces customers into an immediate state of evaluation:
              is this pricing for me?
            </Text>
            <Text>It works, but it also isolates a portion of customers. Those that are curious but NOT ready.</Text>
            <Text>That's why quiz funnels are effective. They're incredibly engaging.</Text>
            <Text>
              When you use a quiz funnel, not only do you give your prospective customers a chance to incrementally
              build commitment to you (longer quizzes actually convert better), but you also get to educate the customer
              about your solution. What makes you different, what results can they expect, etc.
            </Text>
            <Text>All prior to them seeing your offer.</Text>
          </Section>

          <Section>
            <Heading level={2}>Who quiz funnels work with</Heading>
            <Text>
              We've found that they are the most effective with specific niches within health, wellness, and beauty.
            </Text>
            <Text>
              Think products that are tailored to specific people: skincare treatments, weight loss products, lipsticks.
            </Text>
            <Text>These products are not one size fits all.</Text>
            <Text>If your product is made for everyone, it probably won't do well in a quiz.</Text>
            <Text>If it's ONLY for a specific type of person, it might do incredibly well.</Text>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {[
                {
                  title: 'Forge Men',
                  url: 'https://shopfunnel.com/f/QER40GBR',
                },
                {
                  title: 'Jones Road',
                  url: 'https://shopfunnel.com/f/K254XX4X',
                },
                {
                  title: 'Hey Bud Skincare',
                  url: 'https://shopfunnel.com/f/8CT56JB9',
                },
                {
                  title: 'Biocol Labs',
                  url: 'https://shopfunnel.com/f/GM17XCSH',
                },
              ].map((example) => (
                <a
                  key={example.url}
                  className="flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 transition-colors duration-150 hover:bg-muted"
                  href={example.url}
                  target="_blank"
                >
                  <span className="flex-1 whitespace-nowrap">{example.title}</span>
                  <ArrowUpRightIcon className="size-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </Section>

          <Section>
            <Heading level={2}>What we provide</Heading>
            <Text>We'll make you a complete, fully built quiz funnel to test for free.</Text>
            <Text>
              You'll be able to connect it to your custom domain, integrate your meta pixel, and track detailed drop off
              analytics in our software to track the performance.
            </Text>
          </Section>

          <Section>
            <Heading level={2}>Our track record</Heading>
            <Text>The quizzes we've built and actively manage are generating over $1 million dollars per month.</Text>
            <Text>We've seen lifts on old product pages as high as 40% (statistically significant data).</Text>
          </Section>

          <Section>
            <Heading level={2}>What we cost</Heading>
            <Text>The up front trial costs nothing.</Text>
            <Text>
              If the results are good after 14 days, and you'd like to continue using the quiz, we charge a monthly
              subscription based on the visitor capacity you'd like for the quiz.
            </Text>
            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
              <Image
                src="/balmbare.png"
                alt="Balmbare quiz funnel"
                style={{
                  background:
                    'radial-gradient(circle at 20% 80%, rgba(180, 163, 140, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(215, 200, 180, 0.3), transparent 50%), radial-gradient(circle at 40% 40%, rgba(195, 178, 155, 0.2), transparent 60%), linear-gradient(135deg, rgb(252, 249, 244), rgb(240, 234, 224))',
                }}
              />
              <Image
                src="/qure.png"
                alt="Qure quiz funnel"
                style={{
                  background:
                    'radial-gradient(circle at 20% 80%, rgba(163, 163, 163, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(212, 212, 212, 0.3), transparent 50%), radial-gradient(circle at 40% 40%, rgba(115, 115, 115, 0.2), transparent 60%), linear-gradient(135deg, rgb(250, 250, 250), rgb(229, 229, 229))',
                }}
              />
            </div>
            <Button
              className="mt-4"
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => posthog?.capture('Book Call Button Clicked')}
            >
              Book a Call
              <ChevronRightCircleIcon />
            </Button>
          </Section>
        </main>

        <footer className="flex items-center justify-between border-t border-border py-4">
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Shopfunnel Inc. All rights reserved.
          </span>
          <a
            href="mailto:mail@shopfunnel.com"
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => posthog?.capture('Mail Button Clicked')}
          >
            <MailIcon className="size-4" />
          </a>
        </footer>
      </div>
    </>
  )
}
