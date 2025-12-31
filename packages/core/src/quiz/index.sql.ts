import { int, json, mysqlTable, primaryKey, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { id, timestamp, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'
import type { Rule, Step, Theme, Variables } from './types'

export const QuizTable = mysqlTable(
  'quiz',
  {
    ...workspaceColumns,
    ...timestampColumns,
    shortId: varchar('short_id', { length: 8 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    currentVersion: int('current_version').notNull(),
    publishedVersion: int('published_version'),
    publishedAt: timestamp('published_at'),
  },
  (table) => [...workspaceIndexes(table), uniqueIndex('short_id').on(table.shortId)],
)

export const QuizVersionTable = mysqlTable(
  'quiz_version',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    quizId: id('quiz_id').notNull(),
    version: int('version').notNull(),
    pages: json('pages').$type<Step[]>().notNull(),
    rules: json('rules').$type<Rule[]>().notNull(),
    variables: json('variables').$type<Variables>().notNull(),
    theme: json('theme').$type<Theme>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.quizId, table.version] })],
)

export const QuizFileTable = mysqlTable(
  'quiz_file',
  {
    ...timestampColumns,
    workspaceId: id('workspace_id').notNull(),
    quizId: id('quiz_id').notNull(),
    fileId: id('file_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.quizId, table.fileId] })],
)
