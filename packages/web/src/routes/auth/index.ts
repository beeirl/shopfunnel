import { withActor } from '@/context/auth.withActor'
import { Actor } from '@shopfunnel/core/actor'
import { Database } from '@shopfunnel/core/database/index'
import { UserTable } from '@shopfunnel/core/user/index.sql'
import { WorkspaceTable } from '@shopfunnel/core/workspace/index.sql'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { and, desc, eq, isNull } from 'drizzle-orm'

export const Route = createFileRoute('/auth/')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const workspaceId = await getLastSeenWorkspaceId()
          if (!workspaceId) return redirect({ to: '/auth/authorize' })
          return redirect({ to: '/workspace/$workspaceId', params: { workspaceId } })
        } catch {
          return redirect({ to: '/auth/authorize' })
        }
      },
    },
  },
})

async function getLastSeenWorkspaceId() {
  return withActor(async () => {
    const actor = Actor.assert('account')
    return Database.use(async (tx) =>
      tx
        .select({ id: WorkspaceTable.id })
        .from(UserTable)
        .innerJoin(WorkspaceTable, eq(UserTable.workspaceId, WorkspaceTable.id))
        .where(
          and(
            eq(UserTable.accountId, actor.properties.accountId),
            isNull(UserTable.archivedAt),
            isNull(WorkspaceTable.archivedAt),
          ),
        )
        .orderBy(desc(UserTable.lastSeenAt))
        .limit(1)
        .then((rows) => rows[0]?.id),
    )
  })
}
