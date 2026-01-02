import { int, json, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { id, timestampColumns, ulid, workspaceColumns, workspaceIndexes } from '../database/types'

export const QuestionTable = mysqlTable(
  'question',
  {
    ...workspaceColumns,
    ...timestampColumns,
    quizId: id('quiz_id').notNull(),
    blockId: ulid('block_id').notNull(),
    blockType: varchar('block_type', { length: 32 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    index: int('index').notNull(),
    options: json('options').$type<Array<{ id: string; label: string; archived?: boolean }>>(),
  },
  (table) => [...workspaceIndexes(table), uniqueIndex('quiz_block').on(table.workspaceId, table.quizId, table.blockId)],
)
