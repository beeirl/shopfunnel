import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getLastSeenWorkspaceId } from './-common'

const checkAuth = createServerFn().handler(async () => {
  const workspaceId = await getLastSeenWorkspaceId().catch(() => undefined)
  if (workspaceId) throw redirect({ to: '/workspace/$workspaceId', params: { workspaceId } })
})

export const Route = createFileRoute('/')({
  component: RouteComponent,
  beforeLoad: () => checkAuth(),
})

function RouteComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-xs rounded-2xl bg-muted p-2">
        <Card.Root>
          <Card.Header className="text-center">
            <Card.Title>Shopfunnel</Card.Title>
            <Card.Description className="text-balance">
              Currently in closed beta. Invited users can log in below.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <Button className="w-full" nativeButton={false} size="lg" render={<a href="/auth" />}>
              Login
            </Button>
          </Card.Content>
        </Card.Root>
      </div>
    </div>
  )
}
