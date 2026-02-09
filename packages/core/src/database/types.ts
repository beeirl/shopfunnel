import { sql } from 'drizzle-orm'
import { char, MySqlColumn, primaryKey, timestamp, varchar } from 'drizzle-orm/mysql-core'
import { isPlainObject } from 'remeda'

export const id = (name: string) => char(name, { length: 30 })

export const ulid = (name: string) => varchar(name, { length: 26 })

export const workspaceColumns = {
  get id() {
    return id('id').notNull()
  },
  get workspaceId() {
    return id('workspace_id').notNull()
  },
}

export function workspaceIndexes(table: any) {
  return [
    primaryKey({
      columns: [table.workspaceId, table.id],
    }),
  ]
}

export const utc = (name: string) =>
  timestamp(name, {
    fsp: 3,
  })

export const timestampColumns = {
  createdAt: utc('created_at').notNull().defaultNow(),
  updatedAt: utc('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  archivedAt: utc('archived_at'),
}

// Re-export for files using timestamp directly
export { utc as timestamp }

/**
 * Helper for partial JSON updates using MySQL JSON_SET
 */
export function setJson(column: MySqlColumn, json: Record<string, unknown>) {
  function mapToPathValuePairs(obj: Record<string, unknown>, path = '$'): unknown[] {
    return Object.entries(obj).flatMap(([key, value]) => {
      const newPath = `${path}.${key}`
      if (isPlainObject(value)) return mapToPathValuePairs(value as Record<string, unknown>, newPath)
      return [newPath, value]
    })
  }
  const pathValuePairs = mapToPathValuePairs(json).map((value) => sql`${value}`)
  return sql`JSON_SET(${column}, ${sql.join(pathValuePairs, sql`, `)})`
}
