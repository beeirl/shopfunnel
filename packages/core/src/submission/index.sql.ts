import { index, mysqlTable, uniqueIndex } from 'drizzle-orm/mysql-core'
import { id, timestamp, timestampColumns, ulid, workspaceColumns, workspaceIndexes } from '../database/types'

export const SubmissionTable = mysqlTable(
  'submission',
  {
    ...workspaceColumns,
    ...timestampColumns,
    funnelId: id('funnel_id').notNull(),
    funnelVariantId: id('funnel_variant_id'),
    sessionId: ulid('session_id').notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    ...workspaceIndexes(table),
    uniqueIndex('global_session').on(table.sessionId),
    index('funnel').on(table.workspaceId, table.funnelId),
  ],
)
