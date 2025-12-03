import z from 'zod'
import { FormSchema } from './schema'

export namespace Form {
  export type Schema = FormSchema

  export const Info = z.object({
    id: z.string(),
    shortID: z.string(),
    title: z.string(),
    schema: z.record(z.string(), z.any()),
  })
  export type Info = z.infer<typeof Info> & { schema: Schema }
}
