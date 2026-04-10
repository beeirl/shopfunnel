import { json, mysqlEnum, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

export const IntegrationProvider = ['shopify', 'meta_pixel', 'klaviyo', 'recart'] as const
export type IntegrationProvider = (typeof IntegrationProvider)[number]

export type ShopifyCredentials = { accessToken: string }
export type ShopifyMetadata = { shopDomain: string; shopName: string }

export type MetaPixelCredentials = {}
export type MetaPixelMetadata = { pixelId: string }

export type KlaviyoCredentials = { accessToken: string; refreshToken: string; expiresAt: number }
export type KlaviyoMetadata = {}

export type RecartCredentials = { apiKey: string }
export type RecartMetadata = {}

export type IntegrationCredentials = ShopifyCredentials | MetaPixelCredentials | KlaviyoCredentials | RecartCredentials
export type IntegrationMetadata = ShopifyMetadata | MetaPixelMetadata | KlaviyoMetadata | RecartMetadata

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
