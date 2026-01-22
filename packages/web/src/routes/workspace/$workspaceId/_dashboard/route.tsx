import ShopfunnelLogo from '@/assets/shopfunnel-logo.svg?react'
import { Button } from '@/components/ui/button'
import { Menu } from '@/components/ui/menu'
import { Sidebar } from '@/components/ui/sidebar'
import { withActor } from '@/context/auth.withActor'
import { Account } from '@shopfunnel/core/account/index'
import { Actor } from '@shopfunnel/core/actor'
import { Identifier } from '@shopfunnel/core/identifier'
import { User } from '@shopfunnel/core/user/index'
import {
  IconBlocks as BlocksIcon,
  IconFilter2 as FilterIcon,
  IconLogout as LogoutIcon,
  IconSelector as SelectorIcon,
  IconWorld as WorldIcon,
} from '@tabler/icons-react'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet, useLocation, useMatches } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const getUserEmail = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(async () => {
      const actor = Actor.assert('user')
      const user = await User.getAuthEmail(actor.properties.userId)
      return user!
    }, workspaceId)
  })

const getUserEmailQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['user-email', workspaceId],
    queryFn: () => getUserEmail({ data: workspaceId }),
  })

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

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard')({
  component: DashboardLayoutRoute,
  ssr: false,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getUserEmailQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getWorkspacesQueryOptions(params.workspaceId)),
    ])
  },
})

const navItems = [
  {
    title: 'Funnels',
    to: '/workspace/$workspaceId' as const,
    icon: FilterIcon,
    exact: true,
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

function DashboardLayoutRoute() {
  const params = Route.useParams()
  const location = useLocation()

  const getUserEmailQuery = useSuspenseQuery(getUserEmailQueryOptions(params.workspaceId))
  const userEmail = getUserEmailQuery.data

  const workspacesQuery = useSuspenseQuery(getWorkspacesQueryOptions(params.workspaceId))
  const workspaces = workspacesQuery.data
  const currentWorkspace = workspaces.find((workspace) => workspace.id === params.workspaceId)

  const handleWorkspaceSwitch = (workspaceId: string) => {
    if (workspaceId === params.workspaceId) return
    window.location.href = `/workspace/${workspaceId}`
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
              </Sidebar.Menu>
            </Sidebar.GroupContent>
          </Sidebar.Group>
        </Sidebar.Content>
      </Sidebar.Root>

      <Sidebar.Inset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background pr-5 pl-3">
          <div className="flex items-center gap-2">
            <Sidebar.Trigger className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{pageTitle}</span>
          </div>

          <Menu.Root>
            <Menu.Trigger render={<Button variant="outline">{userEmail}</Button>} />
            <Menu.Content align="end">
              <Menu.Item variant="destructive" render={<a href="/auth/logout" />}>
                <LogoutIcon />
                Logout
              </Menu.Item>
            </Menu.Content>
          </Menu.Root>
        </header>

        <main className="flex flex-1 flex-col items-center overflow-y-auto px-5 py-20">
          <div className="w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </Sidebar.Inset>
    </Sidebar.Provider>
  )
}
