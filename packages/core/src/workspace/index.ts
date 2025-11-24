import { z } from 'zod'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { fn } from '../utils/fn'
import { Actor } from '../actor'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { UserTable } from '../user/index.sql'
import { WorkspaceTable } from './index.sql'

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
      const workspaceID = Identifier.create('workspace')
      const userID = Identifier.create('user')
      await Database.transaction(async (tx) => {
        await tx.insert(WorkspaceTable).values({
          id: workspaceID,
          name,
        })
        await tx.insert(UserTable).values({
          workspaceID,
          id: userID,
          accountID: account.properties.accountID,
          name: '',
          role: 'admin',
        })
      })
      return workspaceID
    },
  )

  export const update = fn(
    z.object({
      name: z.string().min(1).max(255),
    }),
    async ({ name }) => {
      Actor.assertAdmin()
      const workspaceID = Actor.workspace()
      return Database.use(async (tx) =>
        tx
          .update(WorkspaceTable)
          .set({
            name,
          })
          .where(eq(WorkspaceTable.id, workspaceID)),
      )
    },
  )

  export const remove = fn(z.void(), async () => {
    await Database.use(async (tx) =>
      tx
        .update(WorkspaceTable)
        .set({ archivedAt: sql`now()` })
        .where(eq(WorkspaceTable.id, Actor.workspace())),
    )
  })
}
