import { index, mysqlTable, primaryKey, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { id, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

export const CampaignTable = mysqlTable(
  'campaign',
  {
    ...workspaceColumns,
    ...timestampColumns,
    shortId: varchar('short_id', { length: 8 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    defaultFunnelId: id('default_funnel_id'),
    domainId: id('domain_id'),
  },
  (table) => [...workspaceIndexes(table), uniqueIndex('short_id').on(table.shortId)],
)

export const CampaignFunnelTable = mysqlTable(
  'campaign_funnel',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    campaignId: id('campaign_id').notNull(),
    funnelId: id('funnel_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.campaignId, table.funnelId] }),
    index('funnel').on(table.workspaceId, table.funnelId),
  ],
)
