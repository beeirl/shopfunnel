import { Resource } from '@quizfunnel/resource'
import { z } from 'zod'
import { fn } from '../utils/fn'

export namespace Storage {
  export function getBucket(isPublic?: boolean) {
    return isPublic === true ? Resource.PublicStorage : Resource.PrivateStorage
  }

  export const get = fn(
    z.object({
      key: z.string(),
      public: z.boolean().optional(),
    }),
    async (input) => {
      const bucket = getBucket(input.public)
      return bucket.get(input.key)
    },
  )

  export const put = fn(
    z.object({
      key: z.string(),
      body: z.instanceof(Buffer),
      contentType: z.string(),
      public: z.boolean().optional(),
      temporary: z.boolean().optional(),
    }),
    async (input) => {
      const bucket = getBucket(input.public)
      await bucket.put(input.key, input.body)
    },
  )

  export const remove = fn(
    z.object({
      keys: z.array(z.string()),
      public: z.boolean().optional(),
    }),
    async (input) => {
      const bucket = getBucket(input.public)
      await bucket.delete(input.keys)
    },
  )
}
