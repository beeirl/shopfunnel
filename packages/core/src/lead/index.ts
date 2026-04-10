import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { fn } from '../utils/fn'
import { LeadTable } from './index.sql'

export namespace Lead {
  export const upsert = fn(
    z.object({
      submissionId: Identifier.schema('submission'),
      email: z.string().optional(),
      phone: z.string().optional(),
    }),
    async (input) => {
      const email = input.email?.trim() || undefined
      const phone = (() => {
        if (!input.phone) return undefined
        const normalized = input.phone.trim().replace(/[\s()-]/g, '')
        return /^\+[1-9]\d{6,14}$/.test(normalized) ? normalized : undefined
      })()
      if (!email && !phone) return

      await Database.use((tx) =>
        tx
          .insert(LeadTable)
          .values({
            id: Identifier.create('lead'),
            workspaceId: Actor.workspaceId(),
            submissionId: input.submissionId,
            email: email,
            phone: phone,
          })
          .onDuplicateKeyUpdate({
            set: {
              ...(email && { email: sql`VALUES(${LeadTable.email})` }),
              ...(phone && { phone: sql`VALUES(${LeadTable.phone})` }),
            },
          }),
      )
    },
  )
}
