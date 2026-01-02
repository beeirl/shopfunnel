import { index, mysqlTable } from 'drizzle-orm/mysql-core'
import { id, timestamp, timestampColumns, ulid, workspaceColumns, workspaceIndexes } from '../database/types'

export const SubmissionTable = mysqlTable(
  'submission',
  {
    ...workspaceColumns,
    ...timestampColumns,
    quizId: id('quiz_id').notNull(),
    sessionId: ulid('session_id').notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [...workspaceIndexes(table), index('session').on(table.sessionId)],
)
