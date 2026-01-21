import { and, eq, getTableColumns, isNull, or } from 'drizzle-orm'
import { z } from 'zod'
import { Actor } from '../actor'
import { AuthProvider, AuthTable } from '../auth/index.sql'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { UserTable } from '../user/index.sql'
import { fn } from '../utils/fn'
import { WorkspaceTable } from '../workspace/index.sql'
import { AccountTable } from './index.sql'

export namespace Account {
  export const fromID = fn(z.string(), async (id) =>
    Database.transaction(async (tx) => {
      return tx
        .select()
        .from(AccountTable)
        .where(eq(AccountTable.id, id))
        .execute()
        .then((rows) => rows[0])
    }),
  )

  export const create = fn(
    z.object({
      id: z.string().optional(),
    }),
    async (input) =>
      Database.transaction(async (tx) => {
        const id = input.id ?? Identifier.create('account')
        await tx.insert(AccountTable).values({
          id,
        })
        return id
      }),
  )

  export const findOrCreate = fn(
    z.object({
      email: z.email(),
      provider: z.enum(AuthProvider),
      subject: z.string(),
    }),
    async (input) => {
      const rows = await Database.use(async (tx) =>
        tx
          .select({
            provider: AuthTable.provider,
            accountId: AuthTable.accountId,
          })
          .from(AuthTable)
          .where(
            or(
              and(eq(AuthTable.provider, input.provider), eq(AuthTable.subject, input.subject)),
              and(eq(AuthTable.provider, 'email'), eq(AuthTable.subject, input.email)),
            ),
          ),
      )
      const idFromProvider = rows.find((row) => row.provider === input.provider)?.accountId
      const idFromEmail = rows.find((row) => row.provider === 'email')?.accountId
      if (idFromProvider && idFromEmail) return idFromProvider

      // create account if not found
      let accountId = idFromProvider ?? idFromEmail
      if (!accountId) {
        console.log('creating account for', input.email)
        accountId = await Account.create({})
      }

      await Database.use((tx) =>
        tx
          .insert(AuthTable)
          .values([
            {
              id: Identifier.create('auth'),
              accountId,
              provider: input.provider,
              subject: input.subject,
            },
            {
              id: Identifier.create('auth'),
              accountId,
              provider: 'email',
              subject: input.email,
            },
          ])
          .onDuplicateKeyUpdate({
            set: {
              archivedAt: null,
            },
          }),
      )

      return accountId
    },
  )

  export const workspaces = () => {
    return Database.transaction(async (tx: Database.TxOrDb) =>
      tx
        .select(getTableColumns(WorkspaceTable))
        .from(WorkspaceTable)
        .innerJoin(UserTable, eq(UserTable.workspaceId, WorkspaceTable.id))
        .where(
          and(
            eq(UserTable.accountId, Actor.accountId()),
            isNull(UserTable.archivedAt),
            isNull(WorkspaceTable.archivedAt),
          ),
        ),
    )
  }
}
