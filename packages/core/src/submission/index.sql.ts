import { char, json, mysqlTable, primaryKey } from 'drizzle-orm/mysql-core'
import { id, timestamp, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

export const SubmissionsTable = mysqlTable(
  'submissions',
  {
    ...workspaceColumns,
    ...timestampColumns,
    quizId: id('quiz_id').notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [...workspaceIndexes(table)],
)

export const SubmissionAnswerTable = mysqlTable(
  'submission_answer',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    submissionId: id('submission_id').notNull(),
    questionId: char('question_id', { length: 26 }).notNull(),
    value: json('value').$type<string | number | boolean | any[]>(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.submissionId, table.questionId] })],
)
