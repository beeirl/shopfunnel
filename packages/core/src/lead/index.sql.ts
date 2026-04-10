import { index, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { id, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

export const LeadTable = mysqlTable(
  'lead',
  {
    ...workspaceColumns,
    ...timestampColumns,
    submissionId: id('submission_id').notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
  },
  (table) => [
    ...workspaceIndexes(table),
    uniqueIndex('submission').on(table.workspaceId, table.submissionId),
    index('email').on(table.workspaceId, table.email),
    index('phone').on(table.workspaceId, table.phone),
  ],
)
