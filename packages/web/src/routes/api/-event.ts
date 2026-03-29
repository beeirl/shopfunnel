import { zValidator } from '@hono/zod-validator'
import { Analytics } from '@shopfunnel/core/analytics/index'
import { ExchangeRate } from '@shopfunnel/core/exchange-rate/index'
import { Resource } from '@shopfunnel/resource'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { UAParser } from 'ua-parser-js'

export const EventRoute = new Hono()
  .use(cors({ origin: '*' }))
  .options('/')
  .post('/', zValidator('json', Analytics.Event), async (c) => {
    let event = c.req.valid('json')

    if (event.type === 'funnel_viewed') {
      const referrer = c.req.header('referer') || undefined
      const userAgent = c.req.header('user-agent') || ''
      const country = (c.req.raw.cf?.country as string) || undefined
      const region = (c.req.raw.cf?.region as string) || undefined
      const city = (c.req.raw.cf?.city as string) || undefined

      const parser = new UAParser(userAgent)
      const os = parser.getOS().name || undefined
      const browser = parser.getBrowser().name || undefined
      const deviceType = parser.getDevice().type
      const device: 'mobile' | 'desktop' = deviceType === 'mobile' || deviceType === 'tablet' ? 'mobile' : 'desktop'

      event = {
        ...event,
        payload: {
          ...event.payload,
          country,
          region,
          city,
          os,
          browser,
          device,
          request_referrer: referrer ?? event.payload.request_referrer,
        },
      }
    }

    if (event.type === 'external_checkout_completed') {
      let amount = event.payload.amount
      let currency = (event.payload.currency || 'USD').toUpperCase()

      if (currency !== 'USD') {
        try {
          const exchangeRate = await ExchangeRate.get(currency)
          amount = Math.round(event.payload.amount / exchangeRate)
          currency = 'USD'
        } catch {}
      }

      event = {
        ...event,
        payload: {
          integration_id: event.payload.integration_id,
          integration_provider: event.payload.integration_provider,
          external_id: event.payload.external_id,
          amount,
          currency,
        },
      }
    }

    await Resource.AnalyticsQueue.sendBatch([{ body: event }])

    return c.body(null, 204)
  })
