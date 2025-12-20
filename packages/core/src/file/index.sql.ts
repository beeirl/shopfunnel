import { bigint, mysqlTable, varchar } from 'drizzle-orm/mysql-core'
import { timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

export const FileTable = mysqlTable(
  'file',
  {
    ...workspaceColumns,
    ...timestampColumns,
    contentType: varchar('content_type', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
  },
  (table) => [...workspaceIndexes(table)],
)
