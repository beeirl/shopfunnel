import { int, json, mysqlTable, primaryKey, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { id, timestamp, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'
import type { Page, Rule, Settings, Theme, Variables } from './types'

export const FunnelTable = mysqlTable(
  'funnel',
  {
    ...workspaceColumns,
    ...timestampColumns,
    shortId: varchar('short_id', { length: 8 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    settings: json('settings').$type<Settings>(),
    domainId: id('domain_id'),
    currentVersion: int('current_version').notNull(),
    publishedVersion: int('published_version'),
    publishedAt: timestamp('published_at'),
  },
  (table) => [...workspaceIndexes(table), uniqueIndex('short_id').on(table.shortId)],
)

export const FunnelVersionTable = mysqlTable(
  'funnel_version',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    funnelId: id('funnel_id').notNull(),
    version: int('version').notNull(),
    pages: json('pages').$type<Page[]>().notNull(),
    rules: json('rules').$type<Rule[]>().notNull(),
    variables: json('variables').$type<Variables>().notNull(),
    theme: json('theme').$type<Theme>().notNull(),
    publishedAt: timestamp('published_at'),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.funnelId, table.version] })],
)

export const FunnelFileTable = mysqlTable(
  'funnel_file',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    funnelId: id('funnel_id').notNull(),
    fileId: id('file_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.funnelId, table.fileId] })],
)
