import { Avatar } from '@/components/ui/avatar'
import { withActor } from '@/context/auth.withActor'
import { Actor } from '@shopfunnel/core/actor'
import { Identifier } from '@shopfunnel/core/identifier'
import { User } from '@shopfunnel/core/user/index'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const getUser = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(async () => {
      const actor = Actor.assert('user')
      const user = await User.fromId(actor.properties.userId)
      return user!
    }, workspaceId)
  })

const getUserQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['user', workspaceId],
    queryFn: () => getUser({ data: workspaceId }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard')({
  component: DashboardLayoutRoute,
  ssr: false,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getUserQueryOptions(params.workspaceId))
  },
})

function DashboardLayoutRoute() {
  const params = Route.useParams()

  const userQuery = useSuspenseQuery(getUserQueryOptions(params.workspaceId))
  const user = userQuery.data

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-8 py-5">
      <nav className="flex justify-between gap-5">
        <div className="flex">
          <Link from={Route.fullPath} to=".">
            <span className="text-lg font-semibold">Shopfunnel</span>
          </Link>
        </div>
        <div className="flex">
          <Avatar.Root>
            <Avatar.Fallback>{user.name[0]}</Avatar.Fallback>
          </Avatar.Root>
        </div>
      </nav>
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}
