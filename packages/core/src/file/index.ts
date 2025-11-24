import { DateTime } from 'luxon'
import { chunk } from 'remeda'
import { z } from 'zod'
import { Actor } from '../actor'
import { and, eq, inArray, lte } from 'drizzle-orm'
import { Storage } from '../storage'
import { VisibleError, VisibleErrorCodes } from '../utils/error'
import { fn } from '../utils/fn'
import { Identifier } from '../identifier'
import { Database } from '../database'
import { fileTable, fileUploadTable } from './index.sql'

export namespace File {
  export const Metadata = z.object({
    id: z.string(),
    contentType: z.string(),
    name: z.string(),
    public: z.boolean(),
    size: z.number(),
    url: z.string().optional(),
    createdAt: z.date(),
  })
  export type Metadata = z.infer<typeof Metadata>

  export const Info = Metadata.extend({
    buffer: z.instanceof(Buffer),
  })
  export type Info = z.infer<typeof Info>

  export const Upload = z.object({
    contentType: z.string(),
    createdAt: z.date(),
    fileID: z.string(),
    name: z.string(),
    public: z.boolean(),
    size: z.number(),
  })
  export type Upload = z.infer<typeof Upload>

  export const fromId = fn(Info.shape.id, async (id) => {
    const metadata = await getMetadata(id)
    if (!metadata) {
      throw new VisibleError('not_found', VisibleErrorCodes.NotFound.RESOURCE_NOT_FOUND, 'File not found')
    }
    const buffer = await Storage.get({
      key: getKey({ fileID: id, workspaceID: Actor.workspaceID() }),
      public: metadata.public,
    })
    if (!buffer) {
      throw new VisibleError('not_found', VisibleErrorCodes.NotFound.RESOURCE_NOT_FOUND, 'File not found in storage')
    }
    return { ...metadata, buffer }
  })

  export const getMetadata = fn(Info.shape.id, (id) =>
    Database.transaction(async (tx) =>
      tx
        .select()
        .from(fileTable)
        .where(and(eq(fileTable.workspaceID, Actor.workspaceID()), eq(fileTable.id, id)))
        .then((rows) => {
          const firstRow = rows[0]
          if (!firstRow) return undefined
          return {
            id: firstRow.id,
            contentType: firstRow.contentType,
            name: firstRow.name,
            public: firstRow.public,
            size: firstRow.size,
            url: firstRow.public ? `${Storage.getBucket(true).url}/${firstRow.id}` : undefined,
            createdAt: firstRow.createdAt,
          }
        }),
    ),
  )

  export const getUrl = fn(
    z.object({
      fileID: Info.shape.id,
      workspaceID: z.string(),
    }),
    (input) => {
      return `${Storage.getBucket(true).url}/${getKey(input)}`
    },
  )

  export const create = fn(
    z.object({
      contentType: Info.shape.contentType,
      data: z.instanceof(Buffer),
      name: Info.shape.name,
      public: Info.shape.public.optional().default(false),
      size: Info.shape.size,
    }),
    async (input) => {
      const id = Identifier.create('file')
      await Storage.put({
        key: getKey({ fileID: id, workspaceID: Actor.workspaceID() }),
        body: input.data,
        contentType: input.contentType,
        public: input.public,
      })
      await Database.use(async (tx) =>
        tx.insert(fileTable).values({
          id,
          workspaceID: Actor.workspaceID(),
          contentType: input.contentType,
          name: input.name,
          public: input.public,
          size: input.data.length,
        }),
      )
      return id
    },
  )

  export const remove = fn(z.string(), async (id) => {
    const file = await Database.use(async (tx) =>
      tx
        .select()
        .from(fileTable)
        .where(and(eq(fileTable.workspaceID, Actor.workspaceID()), eq(fileTable.id, id)))
        .then((rows) => rows[0]),
    )
    if (!file) {
      throw new VisibleError('not_found', VisibleErrorCodes.NotFound.RESOURCE_NOT_FOUND, 'File not found')
    }

    await Storage.remove({
      keys: [getKey({ fileID: file.id, workspaceID: file.workspaceID })],
      public: file.public,
    })
    await Database.use(async (tx) =>
      tx.delete(fileTable).where(and(eq(fileTable.workspaceID, Actor.workspaceID()), eq(fileTable.id, file.id))),
    )
  })

  export const download = fn(Info.shape.id, async (id) => {
    const file = await Database.use(async (tx) =>
      tx
        .select()
        .from(fileTable)
        .where(and(eq(fileTable.workspaceID, Actor.workspaceID()), eq(fileTable.id, id)))
        .then((rows) => rows[0]),
    )
    if (!file) {
      throw new VisibleError('not_found', VisibleErrorCodes.NotFound.RESOURCE_NOT_FOUND, 'File not found')
    }
    const downloadUrl = await Storage.getSignedUrl({
      method: 'get',
      contentType: file.contentType,
      key: getKey({ fileID: file.id, workspaceID: file.workspaceID }),
      public: file.public,
    })
    return { downloadUrl }
  })

  export const upload = fn(
    Upload.pick({
      contentType: true,
      name: true,
      public: true,
      size: true,
    }).partial({
      public: true,
    }),
    async (input) => {
      const fileID = Identifier.create('file')
      await Database.use(async (tx) =>
        tx.insert(fileUploadTable).values({
          contentType: input.contentType,
          fileID,
          name: input.name,
          workspaceID: Actor.workspaceID(),
          public: input.public ?? false,
          size: input.size,
        }),
      )
      const uploadUrl = await Storage.getSignedUrl({
        method: 'put',
        contentType: input.contentType,
        key: getKey({ fileID, workspaceID: Actor.workspaceID() }),
        public: input.public,
      })
      return {
        fileID,
        uploadUrl,
      }
    },
  )

  export const finalizeUpload = fn(Upload.shape.fileID, (fileID) =>
    Database.transaction(async (tx) => {
      const fileUpload = await tx
        .select()
        .from(fileUploadTable)
        .where(and(eq(fileUploadTable.workspaceID, Actor.workspaceID()), eq(fileUploadTable.fileID, fileID)))
        .then((rows) => rows[0])
      if (!fileUpload) {
        throw new VisibleError('not_found', VisibleErrorCodes.NotFound.RESOURCE_NOT_FOUND, 'File upload not found')
      }
      await tx.insert(fileTable).values({
        id: fileUpload.fileID,
        workspaceID: fileUpload.workspaceID,
        contentType: fileUpload.contentType,
        name: fileUpload.name,
        public: fileUpload.public,
        size: fileUpload.size,
      })
      await tx
        .delete(fileUploadTable)
        .where(and(eq(fileUploadTable.workspaceID, Actor.workspaceID()), eq(fileUploadTable.fileID, fileID)))
    }),
  )

  // Purge file uploads that are not finalized and are older than 1 day
  export async function purgeUploads() {
    const fileUploads = await Database.use(async (tx) =>
      tx
        .select()
        .from(fileUploadTable)
        .where(lte(fileUploadTable.createdAt, DateTime.now().minus({ day: 1 }).toJSDate())),
    )
    for (const fileUploadChunk of chunk(fileUploads, 1000)) {
      await Storage.remove({
        keys: fileUploadChunk.map((fileUpload: (typeof fileUploads)[0]) =>
          getKey({ fileID: fileUpload.fileID, workspaceID: fileUpload.workspaceID }),
        ),
        public: fileUploadChunk[0]?.public ?? false,
      })
      await Database.use(async (tx) =>
        tx.delete(fileUploadTable).where(
          inArray(
            fileUploadTable.fileID,
            fileUploadChunk.map((fileUpload: (typeof fileUploads)[0]) => fileUpload.fileID),
          ),
        ),
      )
    }
  }

  const getKey = fn(
    z.object({
      fileID: Info.shape.id,
      workspaceID: z.string(),
    }),
    (input) => {
      return `workspace/${input.workspaceID}/${input.fileID}`
    },
  )
}
