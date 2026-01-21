import { index, mysqlEnum, mysqlTable, primaryKey, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { id, timestampColumns } from '../database/types'

export const AuthProvider = ['email', 'google'] as const

export const AuthTable = mysqlTable(
  'auth',
  {
    id: id('id').notNull(),
    ...timestampColumns,
    provider: mysqlEnum('provider', AuthProvider).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    accountId: id('account_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    uniqueIndex('provider').on(table.provider, table.subject),
    index('account_id').on(table.accountId),
  ],
)
