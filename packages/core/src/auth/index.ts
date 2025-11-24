import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { fn } from '../utils/fn'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { AuthTable, AuthProvider } from './index.sql'
import { Account } from '../account'

export namespace Auth {
  export const create = fn(
    z.object({
      provider: z.enum(AuthProvider),
      subject: z.string(),
      accountID: z.string().optional(),
    }),
    async (input) => {
      const accountID = input.accountID ?? (await Account.create({}))
      return Database.transaction(async (tx) => {
        const id = Identifier.create('auth')
        await tx.insert(AuthTable).values({
          id,
          provider: input.provider,
          subject: input.subject,
          accountID,
        })
        return { id, accountID }
      })
    },
  )

  export const fromProvider = fn(
    z.object({
      provider: z.enum(AuthProvider),
      subject: z.string(),
    }),
    async (input) =>
      Database.use(async (tx) => {
        return tx
          .select()
          .from(AuthTable)
          .where(and(eq(AuthTable.provider, input.provider), eq(AuthTable.subject, input.subject)))
          .then((rows) => rows[0])
      }),
  )

  export const fromAccountID = fn(z.string(), async (accountID) =>
    Database.use(async (tx) => {
      return tx
        .select()
        .from(AuthTable)
        .where(eq(AuthTable.accountID, accountID))
        .execute()
    }),
  )
}

