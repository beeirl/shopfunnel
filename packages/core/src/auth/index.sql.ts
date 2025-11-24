import { index, pgEnum, pgTable, primaryKey, uniqueIndex, varchar } from 'drizzle-orm/pg-core'
import { id, timestampColumns } from '../database/types'

export const AuthProvider = ['email', 'github', 'google'] as const
export const authProviderEnum = pgEnum('provider', AuthProvider)

export const AuthTable = pgTable(
  'auth',
  {
    id: id('id').notNull(),
    ...timestampColumns,
    provider: authProviderEnum().notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    accountID: id('account_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    uniqueIndex('provider').on(table.provider, table.subject),
    index('account_id').on(table.accountID),
  ],
)
