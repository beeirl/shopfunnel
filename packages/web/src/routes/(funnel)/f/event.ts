import { Analytics } from '@shopfunnel/core/analytics/index'
import { Resource } from '@shopfunnel/resource'
import { createFileRoute } from '@tanstack/react-router'
import { UAParser } from 'ua-parser-js'

export const Route = createFileRoute('/(funnel)/f/event')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        const result = Analytics.Event.safeParse(body)
        if (!result.success) return new Response('Invalid event data', { status: 400 })

        let event = result.data

        if (event.type === 'funnel_enter') {
          const userAgent = request.headers.get('user-agent') || ''
          const country = (request.cf?.country as string) || undefined
          const region = (request.cf?.region as string) || undefined
          const city = (request.cf?.city as string) || undefined
          const referrer = request.headers.get('referer') || undefined

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

        return new Response(null, { status: 204 })
      },
    },
  },
})
