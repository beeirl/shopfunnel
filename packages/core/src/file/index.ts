import { Resource } from '@shopfunnel/resource'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { fn } from '../utils/fn'
import { FileTable } from './index.sql'

export namespace File {
  export const create = fn(
    z.object({
      name: z.string(),
      data: z.instanceof(Buffer),
      size: z.number(),
      contentType: z.string(),
      cacheControl: z.string().optional(),
    }),
    async (input) => {
      const id = Identifier.create('file')
      await Resource.Storage.put(key(id), input.data, {
        httpMetadata: {
          contentType: input.contentType,
          cacheControl: input.cacheControl,
        },
      })
      await Database.use((tx) =>
        tx.insert(FileTable).values({
          id,
          workspaceId: Actor.workspaceId(),
          name: input.name,
          size: input.data.length,
          contentType: input.contentType,
        }),
      )
      return {
        id,
        url: url(id),
      }
    },
  )

  export const remove = fn(z.string(), async (id) => {
    const file = await Database.use((tx) =>
      tx
        .select()
        .from(FileTable)
        .where(and(eq(FileTable.workspaceId, Actor.workspaceId()), eq(FileTable.id, id)))
        .then((rows) => rows[0]),
    )
    if (!file) {
      throw new Error('File not found')
    }

    await Resource.Storage.delete(key(id))
    await Database.use(async (tx) =>
      tx.delete(FileTable).where(and(eq(FileTable.workspaceId, Actor.workspaceId()), eq(FileTable.id, file.id))),
    )
  })

  const key = fn(Identifier.schema('file'), (id) => {
    return `workspace/${Actor.workspaceId()}/${id}`
  })

  const url = fn(Identifier.schema('file'), (id) => {
    return `${Resource.STORAGE_URL.value}/${key(id)}`
  })
}
