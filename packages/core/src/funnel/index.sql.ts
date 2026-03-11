import { boolean, index, int, json, mysqlTable, primaryKey, unique, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { id, timestamp, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'
import type { Page, Rule, Settings, Theme, Variables } from './types'

export const FunnelTable = mysqlTable(
  'funnel',
  {
    ...workspaceColumns,
    ...timestampColumns,
    shortId: varchar('short_id', { length: 8 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    settings: json('settings').$type<Settings>(),
    domainId: id('domain_id'),
    mainVariantId: id('main_variant_id'),
    // Legacy columns — kept for migration compatibility
    currentVersion: int('current_version'),
    publishedVersion: int('published_version'),
    publishedAt: timestamp('published_at'),
  },
  (table) => [...workspaceIndexes(table), uniqueIndex('short_id').on(table.shortId)],
)

export const FunnelVariantTable = mysqlTable(
  'funnel_variant',
  {
    ...workspaceColumns,
    ...timestampColumns,
    funnelId: id('funnel_id').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    hasDraft: boolean('has_draft').notNull().default(false),
    publishedVersion: int('published_version'),
  },
  (table) => [...workspaceIndexes(table), index('funnel').on(table.workspaceId, table.funnelId)],
)

export const FunnelVariantDraftTable = mysqlTable(
  'funnel_variant_draft',
  {
    ...workspaceColumns,
    ...timestampColumns,
    funnelId: id('funnel_id').notNull(),
    funnelVariantId: id('funnel_variant_id').notNull(),
    pages: json('pages').$type<Page[]>().notNull(),
    rules: json('rules').$type<Rule[]>().notNull(),
    variables: json('variables').$type<Variables>().notNull(),
    theme: json('theme').$type<Theme>().notNull(),
  },
  (table) => [
    ...workspaceIndexes(table),
    unique('funnel_variant').on(table.workspaceId, table.funnelId, table.funnelVariantId),
  ],
)

export const FunnelVariantVersionTable = mysqlTable(
  'funnel_variant_version',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    funnelId: id('funnel_id').notNull(),
    funnelVariantId: id('funnel_variant_id').notNull(),
    number: int('number').notNull(),
    pages: json('pages').$type<Page[]>().notNull(),
    rules: json('rules').$type<Rule[]>().notNull(),
    variables: json('variables').$type<Variables>().notNull(),
    theme: json('theme').$type<Theme>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.funnelId, table.funnelVariantId, table.number] })],
)

export const FunnelExperimentTable = mysqlTable(
  'funnel_experiment',
  {
    ...workspaceColumns,
    ...timestampColumns,
    funnelId: id('funnel_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
  },
  (table) => [...workspaceIndexes(table), index('funnel').on(table.workspaceId, table.funnelId)],
)

export const FunnelExperimentVariantTable = mysqlTable(
  'funnel_experiment_variant',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    funnelExperimentId: id('funnel_experiment_id').notNull(),
    funnelVariantId: id('funnel_variant_id').notNull(),
    weight: int('weight').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.funnelExperimentId, table.funnelVariantId] }),
    index('experiment').on(table.workspaceId, table.funnelExperimentId),
  ],
)

// Legacy table — kept for migration compatibility
export const FunnelVersionTable = mysqlTable(
  'funnel_version',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    funnelId: id('funnel_id').notNull(),
    version: int('version').notNull(),
    pages: json('pages').$type<Page[]>().notNull(),
    rules: json('rules').$type<Rule[]>().notNull(),
    variables: json('variables').$type<Variables>().notNull(),
    theme: json('theme').$type<Theme>().notNull(),
    publishedAt: timestamp('published_at'),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.funnelId, table.version] })],
)

export const FunnelFileTable = mysqlTable(
  'funnel_file',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    funnelId: id('funnel_id').notNull(),
    fileId: id('file_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.funnelId, table.fileId] })],
)
