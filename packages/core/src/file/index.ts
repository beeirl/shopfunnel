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
        contentType: input.contentType,
      }
    },
  )

  export const createFromUrl = fn(
    z.object({
      url: z.url(),
      name: z.string().optional(),
      cacheControl: z.string().optional(),
    }),
    async (input) => {
      const response = await fetch(input.url)
      if (!response.ok) throw new Error(`Failed to fetch file from URL: ${response.statusText}`)

      const buffer = Buffer.from(await response.arrayBuffer())
      const contentType = response.headers.get('content-type') || 'application/octet-stream'
      const name = input.name || input.url.split('/').pop() || 'unnamed'

      return create({
        name,
        data: buffer,
        size: buffer.length,
        contentType,
        cacheControl: input.cacheControl,
      })
    },
  )

  export const remove = fn(z.string(), async (idOrUrl) => {
    let fileId = idOrUrl
    if (idOrUrl.startsWith('http')) {
      if (!idOrUrl.startsWith(Resource.STORAGE_URL.value)) return
      const segments = idOrUrl.split('/')
      const lastSegment = segments[segments.length - 1]
      if (!lastSegment?.startsWith('fil_')) return
      fileId = lastSegment
    }

    const file = await Database.use((tx) =>
      tx
        .select()
        .from(FileTable)
        .where(and(eq(FileTable.workspaceId, Actor.workspaceId()), eq(FileTable.id, fileId)))
        .then((rows) => rows[0]),
    )
    if (!file) return

    await Resource.Storage.delete(key(fileId))
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
