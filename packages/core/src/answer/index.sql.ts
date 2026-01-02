import { bigint, index, mysqlTable, varchar } from 'drizzle-orm/mysql-core'
import { id, timestampColumns, ulid, workspaceColumns, workspaceIndexes } from '../database/types'

export const AnswerTable = mysqlTable(
  'answer',
  {
    ...timestampColumns,
    ...workspaceColumns,
    submissionId: id('submission_id').notNull(),
    questionId: id('question_id').notNull(),
  },
  (table) => [...workspaceIndexes(table), index('question').on(table.workspaceId, table.questionId)],
)

export const AnswerValueTable = mysqlTable(
  'answer_value',
  {
    ...timestampColumns,
    ...workspaceColumns,
    answerId: id('answer_id').notNull(),
    text: varchar('text', { length: 1000 }),
    number: bigint('number', { mode: 'number' }),
    optionId: ulid('option_id'),
  },
  (table) => [...workspaceIndexes(table), index('answer').on(table.workspaceId, table.answerId)],
)
