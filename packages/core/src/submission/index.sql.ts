import { jsonb, pgTable, primaryKey } from 'drizzle-orm/pg-core'
import { id, timestamp, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

export const SubmissionsTable = pgTable(
  'submissions',
  {
    ...workspaceColumns,
    ...timestampColumns,
    calculations: jsonb('calculations'),
    completedAt: timestamp('completed_at'),
  },
  (table) => [...workspaceIndexes(table)],
)

export const SubmissionAnswerTable = pgTable(
  'submission_answer',
  {
    ...timestampColumns,
    workspaceID: id('workspace_id').notNull(),
    submissionID: id('submission_id').notNull(),
    questionID: id('question_id').notNull(),
    value: jsonb('value').$type<string | number | boolean | any[]>(),
  },
  (table) => [primaryKey({ columns: [table.workspaceID, table.submissionID, table.questionID] })],
)
