import { zValidator } from '@hono/zod-validator'
import { Analytics } from '@shopfunnel/core/analytics/index'
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
      const userAgent = c.req.header('user-agent') || ''
      const country = (c.req.raw.cf?.country as string) || undefined
      const region = (c.req.raw.cf?.region as string) || undefined
      const city = (c.req.raw.cf?.city as string) || undefined
      const referrer = c.req.header('referer') || undefined

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
          referrer,
        },
      }
    }

    await Resource.AnalyticsQueue.sendBatch([{ body: event }])

    return c.body(null, 204)
  })
