import { index, int, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { id, timestamp, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

export const ExperimentTable = mysqlTable(
  'experiment',
  {
    ...workspaceColumns,
    ...timestampColumns,
    campaignId: id('campaign_id').notNull(),
    controlVariantId: id('control_variant_id').notNull(),
    winnerVariantId: id('winner_variant_id'),
    name: varchar('name', { length: 255 }).notNull(),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
  },
  (table) => [
    ...workspaceIndexes(table),
    index('workspace_archived_created').on(table.workspaceId, table.archivedAt, table.createdAt),
    index('active').on(
      table.workspaceId,
      table.campaignId,
      table.archivedAt,
      table.endedAt,
      table.startedAt,
      table.createdAt,
    ),
  ],
)

export const ExperimentVariantTable = mysqlTable(
  'experiment_variant',
  {
    ...workspaceColumns,
    ...timestampColumns,
    experimentId: id('experiment_id').notNull(),
    funnelId: id('funnel_id').notNull(),
    weight: int('weight').notNull().default(0),
  },
  (table) => [
    ...workspaceIndexes(table),
    uniqueIndex('experiment_funnel').on(table.workspaceId, table.experimentId, table.funnelId),
  ],
)
