import { withActor } from '@/context/auth.withActor'
import { Actor } from '@shopfunnel/core/actor'
import { Database } from '@shopfunnel/core/database/index'
import { UserTable } from '@shopfunnel/core/user/index.sql'
import { WorkspaceTable } from '@shopfunnel/core/workspace/index.sql'
import { createMiddleware } from '@tanstack/react-start'
import { and, desc, eq, isNull } from 'drizzle-orm'

export const checkDomain = createMiddleware().server(async ({ request, next }) => {
  const appStage = process.env.VITE_STAGE!
  const appDomain = process.env.VITE_DOMAIN!
  const host = request.headers.get('host')
  if (appStage === 'production' && !host?.endsWith(appDomain)) {
    return new Response('Not Found', { status: 404 })
  }
  return next()
})

export async function getLastSeenWorkspaceId() {
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
