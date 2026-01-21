import { Resource } from '@shopfunnel/resource'
import { Resend as ResendClient } from 'resend'
import { z } from 'zod'
import { fn } from '../utils/fn'

export namespace Resend {
  let client: ResendClient
  const createClient = () => {
    if (!client) {
      client = new ResendClient(Resource.RESEND_API_KEY.value)
    }
    return client
  }

  export const sendEmail = fn(
    z.object({
      from: z.string(),
      to: z.string(),
      subject: z.string(),
      body: z.string(),
      replyTo: z.string().optional(),
    }),
    async (input) => {
      const result = await createClient().emails.send({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.body,
        replyTo: input.replyTo,
      })
      if (result.error) {
        throw new Error(`Failed to send email: ${result.error.message}`)
      }
    },
  )
}
