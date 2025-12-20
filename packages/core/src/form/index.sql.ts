import { int, json, mysqlTable, primaryKey, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { id, timestamp, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'
import type { FormSchema } from './schema'
import type { FormTheme } from './theme'

export const FormTable = mysqlTable(
  'form',
  {
    ...workspaceColumns,
    ...timestampColumns,
    shortId: varchar('short_id', { length: 8 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    currentVersion: int('current_version').notNull(),
    publishedVersion: int('published_version'),
    publishedAt: timestamp('published_at'),
  },
  (table) => [...workspaceIndexes(table), uniqueIndex('short_id').on(table.shortId)],
)

export const FormVersionTable = mysqlTable(
  'form_version',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    formId: id('form_id').notNull(),
    version: int('version').notNull(),
    schema: json('schema').$type<FormSchema>().notNull(),
    theme: json('theme').$type<FormTheme>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.formId, table.version] })],
)

export const FormFileTable = mysqlTable(
  'form_file',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    formId: id('form_id').notNull(),
    fileId: id('file_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.formId, table.fileId] })],
)
