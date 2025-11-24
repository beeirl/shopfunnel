import { z } from 'zod'
import { and, eq, getTableColumns, isNull, sql } from 'drizzle-orm'
import { fn } from '../utils/fn'
import { Database } from '../database'
import { UserRole, UserTable } from './index.sql'
import { Actor } from '../actor'
import { Identifier } from '../identifier'
import { AuthTable } from '../auth/index.sql'

export namespace User {
  const assertNotSelf = (id: string) => {
    if (Actor.userID() !== id) return
    throw new Error(`Expected not self actor, got self actor`)
  }

  export const list = fn(z.void(), () =>
    Database.use(async (tx) =>
      tx
        .select({
          ...getTableColumns(UserTable),
          authEmail: AuthTable.subject,
        })
        .from(UserTable)
        .leftJoin(AuthTable, and(eq(UserTable.accountID, AuthTable.accountID), eq(AuthTable.provider, 'email')))
        .where(and(eq(UserTable.workspaceID, Actor.workspace()), isNull(UserTable.archivedAt))),
    ),
  )

  export const fromID = fn(z.string(), (id) =>
    Database.use(async (tx) =>
      tx
        .select()
        .from(UserTable)
        .where(and(eq(UserTable.workspaceID, Actor.workspace()), eq(UserTable.id, id), isNull(UserTable.archivedAt)))
        .then((rows) => rows[0]),
    ),
  )

  export const getAuthEmail = fn(z.string(), (id) =>
    Database.use(async (tx) =>
      tx
        .select({
          email: AuthTable.subject,
        })
        .from(UserTable)
        .leftJoin(AuthTable, and(eq(UserTable.accountID, AuthTable.accountID), eq(AuthTable.provider, 'email')))
        .where(and(eq(UserTable.workspaceID, Actor.workspace()), eq(UserTable.id, id)))
        .then((rows) => rows[0]?.email),
    ),
  )

  export const invite = fn(
    z.object({
      email: z.string(),
      role: z.enum(UserRole),
    }),
    async ({ email, role }) => {
      Actor.assertAdmin()
      const workspaceID = Actor.workspace()

      const accountID = await Database.use(async (tx) =>
        tx
          .select({
            accountID: AuthTable.accountID,
          })
          .from(AuthTable)
          .where(and(eq(AuthTable.provider, 'email'), eq(AuthTable.subject, email)))
          .then((rows) => rows[0]?.accountID),
      )

      if (accountID) {
        await Database.use(async (tx) =>
          tx
            .insert(UserTable)
            .values({
              id: Identifier.create('user'),
              name: '',
              accountID,
              workspaceID,
              role,
            })
            .onConflictDoUpdate({
              target: [UserTable.workspaceID, UserTable.accountID],
              set: {
                role,
                archivedAt: null,
              },
            }),
        )
      } else {
        await Database.use(async (tx) =>
          tx
            .insert(UserTable)
            .values({
              id: Identifier.create('user'),
              name: '',
              email,
              workspaceID,
              role,
            })
            .onConflictDoUpdate({
              target: [UserTable.workspaceID, UserTable.email],
              set: {
                role,
                archivedAt: null,
              },
            }),
        )
      }
    },
  )

  export const joinInvitedWorkspaces = fn(z.void(), async () => {
    const account = Actor.assert('account')
    const invitations = await Database.use(async (tx) => {
      const invitations = await tx
        .select({
          id: UserTable.id,
          workspaceID: UserTable.workspaceID,
        })
        .from(UserTable)
        .where(eq(UserTable.email, account.properties.email))

      await tx
        .update(UserTable)
        .set({
          accountID: account.properties.accountID,
          email: null,
        })
        .where(eq(UserTable.email, account.properties.email))
      return invitations
    })

    return invitations
  })

  export const update = fn(
    z.object({
      id: z.string(),
      role: z.enum(UserRole),
    }),
    async ({ id, role }) => {
      Actor.assertAdmin()
      if (role === 'member') assertNotSelf(id)
      return Database.use(async (tx) =>
        tx
          .update(UserTable)
          .set({ role })
          .where(and(eq(UserTable.id, id), eq(UserTable.workspaceID, Actor.workspace()))),
      )
    },
  )

  export const remove = fn(z.string(), async (id) => {
    Actor.assertAdmin()
    assertNotSelf(id)

    return Database.use(async (tx) =>
      tx
        .update(UserTable)
        .set({
          archivedAt: sql`now()`,
        })
        .where(and(eq(UserTable.id, id), eq(UserTable.workspaceID, Actor.workspace()))),
    )
  })
}

