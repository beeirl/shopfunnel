import { json, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

export type DomainSettings = {
  faviconUrl?: string | null
  faviconType?: string | null
  customCode?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  metaImageUrl?: string | null
}

export const DomainTable = mysqlTable(
  'domain',
  {
    ...workspaceColumns,
    ...timestampColumns,
    hostname: varchar('hostname', { length: 255 }).notNull(),
    cloudflareHostnameId: varchar('cloudflare_hostname_id', { length: 64 }),
    settings: json('settings').$type<DomainSettings>(),
  },
  (table) => [...workspaceIndexes(table), uniqueIndex('hostname').on(table.hostname)],
)
