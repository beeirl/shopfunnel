import { index, int, json, mysqlTable, unique, varchar } from 'drizzle-orm/mysql-core'
import { id, timestampColumns, ulid, workspaceColumns, workspaceIndexes } from '../database/types'

export const QuestionTable = mysqlTable(
  'question',
  {
    ...workspaceColumns,
    ...timestampColumns,
    funnelId: id('funnel_id').notNull(),
    blockId: ulid('block_id').notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    index: int('index').notNull(),
    options: json('options').$type<Array<{ id: string; label: string; archived?: boolean }>>(),
  },
  (table) => [
    ...workspaceIndexes(table),
    index('funnel').on(table.funnelId),
    unique('funnel_block').on(table.workspaceId, table.funnelId, table.blockId),
  ],
)
