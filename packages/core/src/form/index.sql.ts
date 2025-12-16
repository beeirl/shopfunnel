import { json, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'
import type { FormSchema } from './schema'
import type { FormTheme } from './theme'

export const FormTable = mysqlTable(
  'form',
  {
    ...workspaceColumns,
    ...timestampColumns,
    shortId: varchar('short_id', { length: 8 }).notNull(),
    themeId: varchar('theme_id', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    schema: json('schema').$type<FormSchema>().notNull(),
    theme: json('theme').$type<FormTheme>().notNull(),
  },
  (table) => [...workspaceIndexes(table), uniqueIndex('short_id').on(table.shortId)],
)
