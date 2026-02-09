import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { Actor } from '../actor'
import { BillingTable } from '../billing/index.sql'
import { Database } from '../database'
import { setJson } from '../database/types'
import { Identifier } from '../identifier'
import { UserTable } from '../user/index.sql'
import { fn } from '../utils/fn'
import { WorkspaceFlags, type WorkspaceSurvey, WorkspaceTable } from './index.sql'

export namespace Workspace {
  export const fromID = fn(z.string(), async (id) =>
    Database.use(async (tx) => {
      return tx
        .select()
        .from(WorkspaceTable)
        .where(eq(WorkspaceTable.id, id))
        .then((rows) => rows[0])
    }),
  )

  export const create = fn(
    z.object({
      name: z.string().min(1),
    }),
    async ({ name }) => {
      const account = Actor.assert('account')
      const workspaceId = Identifier.create('workspace')
      const userId = Identifier.create('user')
      await Database.transaction(async (tx) => {
        await tx.insert(WorkspaceTable).values({
          id: workspaceId,
          name,
          flags: { onboardingCompleted: false },
        })
        await tx.insert(UserTable).values({
          workspaceId,
          id: userId,
          accountId: account.properties.accountId,
          name: '',
          role: 'admin',
        })
        await tx.insert(BillingTable).values({
          workspaceId,
          id: Identifier.create('billing'),
        })
      })
      return workspaceId
    },
  )

  export const update = fn(
    z.object({
      name: z.string().min(1).max(255),
    }),
    async ({ name }) => {
      Actor.assertAdmin()
      const workspaceId = Actor.workspace()
      return Database.use(async (tx) =>
        tx
          .update(WorkspaceTable)
          .set({
            name,
          })
          .where(eq(WorkspaceTable.id, workspaceId)),
      )
    },
  )

  export const remove = fn(z.void(), async () => {
    await Database.use(async (tx) =>
      tx
        .update(WorkspaceTable)
        .set({ archivedAt: sql`NOW(3)` })
        .where(eq(WorkspaceTable.id, Actor.workspace())),
    )
  })

  export const listFlags = fn(z.void(), async () => {
    const workspaceId = Actor.workspace()
    return Database.use(async (tx) =>
      tx
        .select({ flags: WorkspaceTable.flags })
        .from(WorkspaceTable)
        .where(eq(WorkspaceTable.id, workspaceId))
        .then((rows) => rows[0]!.flags),
    )
  })

  export const updateFlags = fn(WorkspaceFlags.partial(), async (flags) => {
    const workspaceId = Actor.workspace()
    return Database.use(async (tx) =>
      tx
        .update(WorkspaceTable)
        .set({
          flags: setJson(WorkspaceTable.flags, flags),
        })
        .where(eq(WorkspaceTable.id, workspaceId)),
    )
  })

  export const completeOnboarding = fn(z.custom<WorkspaceSurvey>(), async (survey) => {
    const workspaceId = Actor.workspace()
    return Database.use(async (tx) =>
      tx
        .update(WorkspaceTable)
        .set({
          survey,
          flags: setJson(WorkspaceTable.flags, { onboardingCompleted: true }),
        })
        .where(eq(WorkspaceTable.id, workspaceId)),
    )
  })
}
