import { pgTable, primaryKey } from 'drizzle-orm/pg-core'
import { id, timestampColumns } from '../database/types'

export const AccountTable = pgTable(
  'account',
  {
    id: id('id').notNull(),
    ...timestampColumns,
  },
  (table) => [primaryKey({ columns: [table.id] })],
)
