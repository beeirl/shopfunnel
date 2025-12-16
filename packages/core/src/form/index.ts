import { and, eq, isNull } from 'drizzle-orm'
import z from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { fn } from '../utils/fn'
import { FormTable } from './index.sql'
import type { FormSchema } from './schema'
import { COLORS, RADII, STYLES, type FormTheme } from './theme'

export namespace Form {
  const DEFAULT_THEME: FormTheme = {
    color: COLORS.find((color) => color.name === 'blue')!,
    radius: RADII.find((radius) => radius.name === 'medium')!,
    style: STYLES.find((style) => style.name === 'standard')!,
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
  }

  export const fromId = fn(Identifier.schema('form'), async (id) =>
    Database.use(async (tx) =>
      tx
        .select()
        .from(FormTable)
        .where(and(eq(FormTable.workspaceId, Actor.workspace()), eq(FormTable.id, id), isNull(FormTable.archivedAt)))
        .then((rows) => rows[0]),
    ),
  )

  export const fromShortId = fn(z.string().length(8), async (shortId) =>
    Database.use(async (tx) =>
      tx
        .select()
        .from(FormTable)
        .where(and(eq(FormTable.shortId, shortId), isNull(FormTable.archivedAt)))
        .then((rows) => rows[0]),
    ),
  )

  export const list = fn(z.void(), () =>
    Database.use(async (tx) =>
      tx
        .select()
        .from(FormTable)
        .where(and(eq(FormTable.workspaceId, Actor.workspace()), isNull(FormTable.archivedAt))),
    ),
  )

  export const create = async () => {
    const id = Identifier.create('form')
    const shortId = id.slice(-8)
    await Database.use(async (tx) =>
      tx.insert(FormTable).values({
        id,
        workspaceId: Actor.workspace(),
        shortId,
        themeId: '',
        title: 'My new form',
        schema: DEFAULT_SCHEMA,
        theme: DEFAULT_THEME,
      }),
    )
    return id
  }

  export const update = fn(
    z.object({
      id: Identifier.schema('form'),
      themeId: Identifier.schema('theme').optional(),
      title: z.string().min(1).max(255).optional(),
      schema: z.custom<FormSchema>().optional(),
      theme: z.custom<FormTheme>().optional(),
    }),
    (input) => {
      return Database.use(async (tx) =>
        tx
          .update(FormTable)
          .set({
            themeId: input.themeId,
            title: input.title,
            schema: input.schema,
            theme: input.theme,
          })
          .where(and(eq(FormTable.id, input.id), eq(FormTable.workspaceId, Actor.workspace()))),
      )
    },
  )
}
