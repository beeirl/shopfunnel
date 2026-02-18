import { json, mysqlEnum, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

export const IntegrationProvider = ['shopify', 'meta_pixel'] as const
export type IntegrationProvider = (typeof IntegrationProvider)[number]

export type ShopifyCredentials = { accessToken: string }
export type ShopifyMetadata = { shopDomain: string; shopName: string }

export type MetaPixelCredentials = {}
export type MetaPixelMetadata = { pixelId: string }

export type IntegrationCredentials = ShopifyCredentials | MetaPixelCredentials
export type IntegrationMetadata = ShopifyMetadata | MetaPixelMetadata

export const IntegrationTable = mysqlTable(
  'integration',
  {
    ...workspaceColumns,
    ...timestampColumns,
    provider: mysqlEnum('provider', IntegrationProvider).notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    credentials: json('credentials').$type<IntegrationCredentials>().notNull(),
    metadata: json('metadata').$type<IntegrationMetadata>(),
  },
  (table) => [
    ...workspaceIndexes(table),
    uniqueIndex('unique_external').on(table.workspaceId, table.provider, table.externalId),
  ],
)
