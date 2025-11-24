import { withActor } from '@/context/auth.withActor'
import { AppLayout } from '@beeirl/ui/app-layout'
import { Account } from '@quizfunnel/core/account/index'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const getWorkspacesFn = createServerFn().handler(() => {
  return withActor(() => {
    return Account.workspaces()
  })
})

const workspacesQueryOptions = () =>
  queryOptions({
    queryKey: ['workspaces'],
    queryFn: () => getWorkspacesFn(),
  })

export const Route = createFileRoute('/$workspaceID')({
  ssr: 'data-only',
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(workspacesQueryOptions())
  },
})

function RouteComponent() {
  const workspacesQuery = useSuspenseQuery(workspacesQueryOptions())

  return (
    <AppLayout.Root>
      <Outlet />
    </AppLayout.Root>
  )
}
