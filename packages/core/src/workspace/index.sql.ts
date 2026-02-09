import { json, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { z } from 'zod'
import { id, timestampColumns } from '../database/types'

export const WorkspaceFlags = z.object({
  onboardingCompleted: z.boolean(),
})
export type WorkspaceFlags = z.infer<typeof WorkspaceFlags>

export type WorkspaceSurvey = {
  shopUrl?: string
  shopPlatform?: 'shopify' | 'woocommerce' | 'bigcommerce' | 'magento' | 'squarespace' | 'wix' | 'custom' | 'other'
  productCategory?: 'physical' | 'digital'
  monthlyVisitors?: '0-25k' | '25k-50k' | '50k-100k' | '100k-250k' | '250k-500k' | '500k-1m' | '1m+' | 'none'
  referralSource?:
    | 'x'
    | 'youtube'
    | 'tiktok'
    | 'instagram'
    | 'google'
    | 'email_or_newsletter'
    | 'friends'
    | 'facebook'
    | 'linkedin'
    | 'podcast'
    | 'ai'
    | 'other'
}

export const WorkspaceTable = mysqlTable(
  'workspace',
  {
    id: id('id').notNull().primaryKey(),
    slug: varchar('slug', { length: 255 }),
    name: varchar('name', { length: 255 }).notNull(),
    flags: json('flags').$type<WorkspaceFlags>().notNull(),
    survey: json('survey').$type<WorkspaceSurvey>(),
    ...timestampColumns,
  },
  (table) => [uniqueIndex('slug').on(table.slug)],
)
