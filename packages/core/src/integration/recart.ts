import { z } from 'zod'
import { fn } from '../utils/fn'
import { Integration } from './index'

export namespace Recart {
  const SOURCE_CATEGORY = 'shopfunnel'
  const SOURCE_NAME = 'subscription'

  export const connect = fn(
    z.object({
      apiKey: z.string().min(1),
    }),
    async (input) => {
      await fetch('https://api.recart.com/app-integrations/2023-12/event-sources', {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          'User-Agent': 'ShopFunnel/1.0',
          'X-Recart-API-Key': input.apiKey,
        },
        body: JSON.stringify({
          data: {
            type: 'events',
            attributes: {
              category: 'shopfunnel',
              name: 'subscription',
              type: 'optin',
            },
          },
        }),
      })

      await Integration.connect({
        provider: 'recart',
        externalId: 'default',
        title: 'Recart',
        credentials: { apiKey: input.apiKey },
      })
    },
  )

  export const syncLeads = fn(
    z.object({
      apiKey: z.string(),
      phoneNumbers: z.array(z.string()),
    }),
    async (input) => {
      for (const phoneNumber of input.phoneNumbers) {
        const response = await fetch('https://api.recart.com/app-integrations/2023-12/subscriptions', {
          method: 'POST',
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            'User-Agent': 'ShopFunnel/1.0',
            'X-Recart-API-Key': input.apiKey,
          },
          body: JSON.stringify({
            data: {
              type: 'subscriptions',
              attributes: {
                phoneNumber,
                source: {
                  category: SOURCE_CATEGORY,
                  name: SOURCE_NAME,
                },
              },
            },
          }),
        })

        if (!response.ok) {
          const text = await response.text()
          console.error(`Recart API error (${response.status}): ${text}`)
        }
      }
    },
  )
}
