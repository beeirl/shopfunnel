import { mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

export const DomainTable = mysqlTable(
  'domain',
  {
    ...workspaceColumns,
    ...timestampColumns,
    hostname: varchar('hostname', { length: 255 }).notNull(),
    cloudflareHostnameId: varchar('cloudflare_hostname_id', { length: 64 }),
  },
  (table) => [...workspaceIndexes(table), uniqueIndex('hostname').on(table.hostname)],
)
