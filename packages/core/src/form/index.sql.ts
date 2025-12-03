import { jsonb, pgTable, uniqueIndex, varchar } from 'drizzle-orm/pg-core'
import { timestamp, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'
import { FormSchema } from './schema'

export const FormTable = pgTable(
  'form',
  {
    ...workspaceColumns,
    ...timestampColumns,
    shortID: varchar('short_id', { length: 6 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    schema: jsonb('schema').$type<FormSchema>().notNull(),
    closedAt: timestamp('closed_at'),
    closesAt: timestamp('closes_at'),
  },
  (table) => [...workspaceIndexes(table), uniqueIndex('short_id').on(table.workspaceID, table.shortID)],
)
