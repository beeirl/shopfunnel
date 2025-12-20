import { and, eq, isNull, sql } from 'drizzle-orm'
import { groupBy, map, pipe, values } from 'remeda'
import z from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { File } from '../file'
import { Identifier } from '../identifier'
import { fn } from '../utils/fn'
import { FormFileTable, FormTable, FormVersionTable } from './index.sql'
import type { FormSchema } from './schema'
import { RADII, type FormTheme } from './theme'

export namespace Form {
  const NEW_VERSION_THRESHOLD = 15 * 60 * 1000

  const DEFAULT_THEME: FormTheme = {
    colors: {
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#0a0a0a',
    },
    radius: RADII.find((radius) => radius.name === 'medium')!,
  }

  const DEFAULT_SCHEMA: FormSchema = {
    pages: [],
    rules: [],
    variables: {},
  }

  export type Info = {
    id: string
    shortId: string
    title: string
    schema: FormSchema
    theme: FormTheme
    createdAt: Date
    published: boolean
    publishedAt: Date | null
  }

  export const getCurrentVersion = fn(Identifier.schema('form'), (id) =>
    Database.use((tx) =>
      tx
        .select()
        .from(FormTable)
        .innerJoin(
          FormVersionTable,
          and(
            eq(FormVersionTable.formId, FormTable.id),
            eq(FormVersionTable.workspaceId, FormTable.workspaceId),
            eq(FormVersionTable.version, FormTable.currentVersion),
          ),
        )
        .where(and(eq(FormTable.workspaceId, Actor.workspace()), eq(FormTable.id, id), isNull(FormTable.archivedAt)))
        .then((rows) => serializeVersion(rows)[0]),
    ),
  )

  export const getPublishedVersion = fn(z.string(), (input) => {
    const isShortId = input.length === 8
    return Database.use((tx) =>
      tx
        .select()
        .from(FormTable)
        .innerJoin(
          FormVersionTable,
          and(
            eq(FormVersionTable.formId, FormTable.id),
            eq(FormVersionTable.workspaceId, FormTable.workspaceId),
            eq(FormVersionTable.version, FormTable.publishedVersion),
          ),
        )
        .where(and(isShortId ? eq(FormTable.shortId, input) : eq(FormTable.id, input), isNull(FormTable.archivedAt)))
        .then((rows) => serializeVersion(rows)[0]),
    )
  })

  export const list = fn(z.void(), () =>
    Database.use((tx) =>
      tx
        .select()
        .from(FormTable)
        .where(and(eq(FormTable.workspaceId, Actor.workspace()), isNull(FormTable.archivedAt)))
        .then((rows) => rows.map(serialize)),
    ),
  )

  export const create = async () => {
    const id = Identifier.create('form')
    const shortId = id.slice(-8)
    const currentVersion = 1

    await Database.use(async (tx) => {
      await tx.insert(FormTable).values({
        id,
        workspaceId: Actor.workspace(),
        shortId,
        title: 'My new form',
        currentVersion,
      })

      await tx.insert(FormVersionTable).values({
        workspaceId: Actor.workspace(),
        formId: id,
        version: currentVersion,
        schema: DEFAULT_SCHEMA,
        theme: DEFAULT_THEME,
      })
    })

    return id
  }

  export const createFile = fn(
    z.object({
      formId: Identifier.schema('form'),
      contentType: z.string(),
      data: z.instanceof(Buffer),
      name: z.string(),
      size: z.number(),
    }),
    async (input) => {
      const file = await File.create({
        contentType: input.contentType,
        data: input.data,
        name: input.name,
        size: input.size,
      })
      await Database.use((tx) =>
        tx.insert(FormFileTable).values({
          workspaceId: Actor.workspace(),
          formId: input.formId,
          fileId: file.id,
        }),
      )
      return file
    },
  )

  export const update = fn(
    z.object({
      id: Identifier.schema('form'),
      title: z.string().min(1).max(255).optional(),
      schema: z.custom<FormSchema>().optional(),
      theme: z.custom<FormTheme>().optional(),
    }),
    async (input) => {
      await Database.use(async (tx) => {
        const form = await tx
          .select({
            currentVersion: FormTable.currentVersion,
            publishedVersion: FormTable.publishedVersion,
          })
          .from(FormTable)
          .where(and(eq(FormTable.id, input.id), eq(FormTable.workspaceId, Actor.workspace())))
          .then((rows) => rows[0])
        if (!form) return

        const currentVersion = await tx
          .select()
          .from(FormVersionTable)
          .where(
            and(
              eq(FormVersionTable.workspaceId, Actor.workspace()),
              eq(FormVersionTable.formId, input.id),
              eq(FormVersionTable.version, form.currentVersion),
            ),
          )
          .then((rows) => rows[0])
        if (!currentVersion) return

        const published = form.currentVersion === form.publishedVersion
        const timeSinceUpdate = Date.now() - currentVersion.updatedAt.getTime()
        const needsNewVersion = published || timeSinceUpdate > NEW_VERSION_THRESHOLD

        if (needsNewVersion) {
          const newVersion = currentVersion.version + 1

          await tx.insert(FormVersionTable).values({
            workspaceId: Actor.workspace(),
            formId: input.id,
            version: newVersion,
            schema: input.schema ?? currentVersion.schema,
            theme: input.theme ?? currentVersion.theme,
          })

          await tx
            .update(FormTable)
            .set({
              title: input.title,
              currentVersion: newVersion,
            })
            .where(and(eq(FormTable.workspaceId, Actor.workspace()), eq(FormTable.id, input.id)))
        } else {
          await tx
            .update(FormVersionTable)
            .set({
              schema: input.schema,
              theme: input.theme,
            })
            .where(
              and(
                eq(FormVersionTable.workspaceId, Actor.workspace()),
                eq(FormVersionTable.formId, input.id),
                eq(FormVersionTable.version, form.currentVersion),
              ),
            )

          if (input.title) {
            await tx
              .update(FormTable)
              .set({ title: input.title })
              .where(and(eq(FormTable.workspaceId, Actor.workspace()), eq(FormTable.id, input.id)))
          }
        }
      })
    },
  )

  export const publish = fn(Identifier.schema('form'), async (id) => {
    await Database.use(async (tx) => {
      const form = await tx
        .select()
        .from(FormTable)
        .where(and(eq(FormTable.workspaceId, Actor.workspace()), eq(FormTable.id, id)))
        .then((rows) => rows[0])
      if (!form) return
      if (form.currentVersion === form.publishedVersion) return

      await tx
        .update(FormTable)
        .set({
          publishedVersion: form.currentVersion,
          publishedAt: sql`NOW(3)`,
        })
        .where(and(eq(FormTable.workspaceId, Actor.workspace()), eq(FormTable.id, id)))
    })
  })

  function serialize(rows: typeof FormTable.$inferSelect) {
    return {
      id: rows.id,
      shortId: rows.shortId,
      title: rows.title,
      published: rows.currentVersion === rows.publishedVersion,
      createdAt: rows.createdAt,
      publishedAt: rows.publishedAt,
    }
  }

  function serializeVersion(
    rows: {
      form: typeof FormTable.$inferSelect
      form_version: typeof FormVersionTable.$inferSelect
    }[],
  ) {
    return pipe(
      rows,
      groupBy((row) => row.form.id),
      values(),
      map(
        (group): Info => ({
          id: group[0].form.id,
          shortId: group[0].form.shortId,
          title: group[0].form.title,
          schema: group[0].form_version.schema,
          theme: group[0].form_version.theme,
          published: group[0].form.currentVersion === group[0].form.publishedVersion,
          createdAt: group[0].form.createdAt,
          publishedAt: group[0].form.publishedAt,
        }),
      ),
    )
  }
}
