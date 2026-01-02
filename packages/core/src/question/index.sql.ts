import { index, int, json, mysqlTable, unique, varchar } from 'drizzle-orm/mysql-core'
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
    options: json('options').$type<Record<string, { id: string; label: string; index: number }>>(),
  },
  (table) => [
    ...workspaceIndexes(table),
    index('quiz_block_idx').on(table.workspaceId, table.quizId, table.blockId),
    unique('quiz_block_unique').on(table.workspaceId, table.quizId, table.blockId),
  ],
)
