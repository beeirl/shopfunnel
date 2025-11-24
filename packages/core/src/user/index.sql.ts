import { pgTable, uniqueIndex, varchar, pgEnum, index } from 'drizzle-orm/pg-core'
import { timestampColumns, id, workspaceColumns, timestamp, workspaceIndexes } from '../database/types'

export const UserRole = ['admin', 'member'] as const
export const userRoleEnum = pgEnum('role', UserRole)

export const UserTable = pgTable(
  'user',
  {
    ...workspaceColumns,
    ...timestampColumns,
    accountID: id('account_id'),
    email: varchar('email', { length: 255 }),
    name: varchar('name', { length: 255 }).notNull(),
    lastSeenAt: timestamp('last_seen_at'),
    role: userRoleEnum().notNull(),
  },
  (table) => [
    ...workspaceIndexes(table),
    uniqueIndex('user_account_id').on(table.workspaceID, table.accountID),
    uniqueIndex('user_email').on(table.workspaceID, table.email),
    index('global_account_id').on(table.accountID),
    index('global_email').on(table.email),
  ],
)
