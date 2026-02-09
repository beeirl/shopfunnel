import ShopfunnelLogo from '@/assets/shopfunnel-logo.svg?react'
import { Button } from '@/components/ui/button'
import { CircularProgress } from '@/components/ui/circular-progress'
import { Menu } from '@/components/ui/menu'
import { Sidebar } from '@/components/ui/sidebar'
import { withActor } from '@/context/auth.withActor'
import { Account } from '@shopfunnel/core/account/index'
import { Identifier } from '@shopfunnel/core/identifier'
import {
  IconBlocks as BlocksIcon,
  IconBolt as BoltIcon,
  IconCreditCard as CreditCardIcon,
  IconDashboard as DashboardIcon,
  IconFilter2 as FilterIcon,
  IconLogout as LogoutIcon,
  IconSelector as SelectorIcon,
  IconWorld as WorldIcon,
} from '@tabler/icons-react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet, useLocation, useMatches } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { usePostHog } from 'posthog-js/react'
import * as React from 'react'
import {
  checkBilling,
  checkOnboarding,
  getBillingQueryOptions,
  getUsageQueryOptions,
  getUserEmailQueryOptions,
} from '../-common'
import { BillingDialog } from '../-components/billing-dialog'

const getWorkspaces = createServerFn({ method: 'GET' })
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => Account.workspaces(), workspaceId)
  })

const getWorkspacesQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['workspaces', workspaceId],
    queryFn: () => getWorkspaces({ data: workspaceId }),
  })

export const Route = createFileRoute('/_app/workspace/$workspaceId/_dashboard')({
  component: DashboardLayoutRoute,
  beforeLoad: async ({ params }) => {
    await checkOnboarding({ data: params.workspaceId })
    await checkBilling({ data: params.workspaceId })
  },
  loader: async ({ context, params }) => {
    const [billing] = await Promise.all([
      context.queryClient.ensureQueryData(getBillingQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getUserEmailQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getWorkspacesQueryOptions(params.workspaceId)),
    ])
    context.queryClient.ensureQueryData(
      getUsageQueryOptions(params.workspaceId, billing.lastSubscribedAt?.toISOString() ?? null),
    )
  },
})

const navItems = [
  {
    title: 'Dashboard',
    to: '/workspace/$workspaceId' as const,
    icon: DashboardIcon,
    exact: true,
  },
  {
    title: 'Funnels',
    to: '/workspace/$workspaceId/funnels' as const,
    icon: FilterIcon,
    exact: false,
  },
  {
    title: 'Domains',
    to: '/workspace/$workspaceId/domains' as const,
    icon: WorldIcon,
    exact: false,
  },
  {
    title: 'Integrations',
    to: '/workspace/$workspaceId/integrations' as const,
    icon: BlocksIcon,
    exact: false,
  },
]

function TrialProgressButton(props: React.ComponentProps<typeof Button>) {
  const params = Route.useParams()

  const billingQuery = useSuspenseQuery(getBillingQueryOptions(params.workspaceId))
  const billing = billingQuery.data

  if (!billing.trialEndsAt || billing.exempted) return null

  const now = new Date()
  const trialEnd = new Date(billing.trialEndsAt)

  if (trialEnd <= now) return null

  const trialStart = new Date(billing.trialStartedAt!)
  const totalDuration = trialEnd.getTime() - trialStart.getTime()
  const elapsed = now.getTime() - trialStart.getTime()
  const value = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100))

  const msRemaining = trialEnd.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))

  return (
    <Button variant="ghost" {...props}>
      <CircularProgress.Root value={value} size={16} strokeWidth={2.5}>
        <CircularProgress.Track>
          <CircularProgress.Indicator />
        </CircularProgress.Track>
      </CircularProgress.Root>
      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
    </Button>
  )
}

function DashboardLayoutRoute() {
  const params = Route.useParams()
  const location = useLocation()
  const posthog = usePostHog()
  const [billingDialogOpen, setBillingDialogOpen] = React.useState(false)

  const billingQuery = useSuspenseQuery(getBillingQueryOptions(params.workspaceId))
  const billing = billingQuery.data

  const getUserEmailQuery = useSuspenseQuery(getUserEmailQueryOptions(params.workspaceId))
  const userEmail = getUserEmailQuery.data

  const workspacesQuery = useSuspenseQuery(getWorkspacesQueryOptions(params.workspaceId))
  const workspaces = workspacesQuery.data
  const currentWorkspace = workspaces.find((workspace) => workspace.id === params.workspaceId)

  const handleWorkspaceSwitch = (workspaceId: string) => {
    if (workspaceId === params.workspaceId) return
    let href = `/workspace/${workspaceId}`
    href += location.pathname.slice(`/workspace/${params.workspaceId}`.length)
    href += window.location.search
    href += window.location.hash
    window.location.href = href
  }

  const handleLogout = () => {
    posthog.reset()
    window.location.href = '/auth/logout'
  }

  const isRouteActive = (to: string, exact?: boolean) => {
    const resolvedPath = to.replace('$workspaceId', params.workspaceId)
    if (exact) {
      return location.pathname === resolvedPath
    }
    return location.pathname.startsWith(resolvedPath)
  }

  const matches = useMatches()
  const currentMatch = matches[matches.length - 1]
  const pageTitle = (currentMatch?.staticData as { title?: string })?.title ?? 'Dashboard'

  return (
    <Sidebar.Provider name="dashboard">
      <Sidebar.Root>
        <Sidebar.Header>
          <div className="flex h-9.5 items-center px-2">
            <Link className="focus:outline-none" to="/workspace/$workspaceId" params={params}>
              <ShopfunnelLogo className="h-4 w-auto" />
            </Link>
          </div>
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Menu.Root>
                <Menu.Trigger
                  render={
                    <Sidebar.MenuButton className="h-9 rounded-lg pl-3" variant="outline">
                      {currentWorkspace?.name ?? 'Workspace'}
                      <SelectorIcon className="ml-auto" />
                    </Sidebar.MenuButton>
                  }
                />
                <Menu.Content className="w-(--anchor-width)" side="bottom" align="start">
                  <Menu.Group>
                    <Menu.Label>Workspaces</Menu.Label>
                    <Menu.RadioGroup value={params.workspaceId}>
                      {workspaces.map((workspace) => (
                        <Menu.RadioItem
                          key={workspace.id}
                          value={workspace.id}
                          onClick={() => handleWorkspaceSwitch(workspace.id)}
                        >
                          {workspace.name}
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Group>
                </Menu.Content>
              </Menu.Root>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Header>

        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.GroupContent>
              <Sidebar.Menu className="gap-1">
                {navItems.map((item) => (
                  <Sidebar.MenuItem key={item.title}>
                    <Sidebar.MenuButton
                      render={<Link to={item.to} params={params} />}
                      isActive={isRouteActive(item.to, item.exact)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                ))}
                {billing?.plan && (
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton onClick={() => setBillingDialogOpen(true)}>
                      <CreditCardIcon />
                      Billing
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                )}
              </Sidebar.Menu>
            </Sidebar.GroupContent>
          </Sidebar.Group>
        </Sidebar.Content>

        {billing?.exempted && !billing.plan && (
          <Sidebar.Footer>
            <Link
              from={Route.fullPath}
              to="subscribe"
              className="group/subscribe relative isolate z-1 flex h-8 w-full items-center justify-center gap-2 overflow-hidden rounded-lg p-0 px-1.5 text-sm font-medium"
              aria-label="Subscribe"
            >
              <div className="pointer-events-none absolute inset-0 z-10 rounded-lg ring-1 ring-gray-200 ring-inset group-hover/subscribe:ring-gray-300" />
              <div
                className="absolute inset-0 group-hover/subscribe:bg-gray-200"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(135deg, var(--background), var(--background) 4px, oklch(0 0 0 / 0.05) 4px, oklch(0 0 0 / 0.05) 8px)',
                }}
              />
              <div
                className="absolute inset-0 z-1"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, var(--background), color-mix(in oklch, var(--background), transparent))',
                }}
              />
              <div className="relative z-2 flex items-center gap-2">
                <div className="flex size-4.5 items-center justify-center rounded-full bg-linear-to-b from-gray-500 to-black">
                  <BoltIcon className="size-2.5 text-white" fill="currentColor" />
                </div>
                <span className="relative">Subscribe</span>
              </div>
            </Link>
          </Sidebar.Footer>
        )}
      </Sidebar.Root>

      <Sidebar.Inset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background pr-5 pl-3">
          <div className="flex items-center gap-2">
            <Sidebar.Trigger className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{pageTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <TrialProgressButton onClick={() => setBillingDialogOpen(true)} />
            <Menu.Root>
              <Menu.Trigger render={<Button variant="outline">{userEmail}</Button>} />
              <Menu.Content align="end">
                <Menu.Item variant="destructive" onClick={handleLogout}>
                  <LogoutIcon />
                  Logout
                </Menu.Item>
              </Menu.Content>
            </Menu.Root>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center overflow-y-auto px-5 py-5 md:py-20">
          <Outlet />
        </main>
      </Sidebar.Inset>

      <BillingDialog open={billingDialogOpen} onOpenChange={setBillingDialogOpen} />
    </Sidebar.Provider>
  )
}
