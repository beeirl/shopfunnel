import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PostHogProvider } from 'posthog-js/react'
import { getSessionQueryOptions, getUserEmailQueryOptions } from './-common'

export const Route = createFileRoute('/_app/workspace/$workspaceId')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId)),
      context.queryClient.ensureQueryData(getUserEmailQueryOptions(params.workspaceId)),
    ])
  },
})

function RouteComponent() {
  const params = Route.useParams()

  const sessionQuery = useSuspenseQuery(getSessionQueryOptions(params.workspaceId))
  const getUserEmailQuery = useSuspenseQuery(getUserEmailQueryOptions(params.workspaceId))

  if (import.meta.env.VITE_DEV) {
    return <Outlet />
  }

  return (
    <PostHogProvider
      apiKey={import.meta.env.VITE_POSTHOG_API_KEY!}
      options={{
        api_host: 'https://us.i.posthog.com',
        autocapture: false,
        capture_exceptions: true,
        loaded: (posthog) => {
          posthog.identify(sessionQuery.data.accountId, undefined, {
            email: getUserEmailQuery.data,
          })
        },
      }}
    >
      <Outlet />
    </PostHogProvider>
  )
}
