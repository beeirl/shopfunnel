import { z } from 'zod'

export namespace Analytics {
  const EventBase = z.object({
    visitor_id: z.string(),
    session_id: z.string(),
    workspace_id: z.string(),
    campaign_id: z.string().optional(),
    experiment_id: z.string().optional(),
    experiment_variant_id: z.string().optional(),
    funnel_id: z.string(),
    funnel_version: z.number(),
    version: z.string(),
    timestamp: z.string(),
  })

  const FunnelViewedEvent = z.object({
    ...EventBase.shape,
    type: z.literal('funnel_viewed'),
    payload: z.object({
      device: z.enum(['mobile', 'desktop']).optional(),
      os: z.string().optional(),
      browser: z.string().optional(),
      country: z.string().optional(),
      region: z.string().optional(),
      city: z.string().optional(),
      referrer: z.string().optional(),
      document_referrer: z.string().optional(),
      request_referrer: z.string().optional(),
      landing_url: z.string().optional(),
      landing_path: z.string().optional(),
      landing_query: z.string().optional(),
      utm_source: z.string().optional(),
      utm_medium: z.string().optional(),
      utm_campaign: z.string().optional(),
      utm_content: z.string().optional(),
      utm_term: z.string().optional(),
      utm_id: z.string().optional(),
      fbclid: z.string().optional(),
      gclid: z.string().optional(),
      ttclid: z.string().optional(),
      msclkid: z.string().optional(),
      dclid: z.string().optional(),
      gbraid: z.string().optional(),
      wbraid: z.string().optional(),
      twclid: z.string().optional(),
      tw_source: z.string().optional(),
      tw_campaign: z.string().optional(),
      tw_adid: z.string().optional(),
    }),
  })

  const FunnelStartedEvent = z.object({
    ...EventBase.shape,
    type: z.literal('funnel_started'),
    payload: z.object({}),
  })

  const FunnelCompletedEvent = z.object({
    ...EventBase.shape,
    type: z.literal('funnel_completed'),
    payload: z.object({}),
  })

  const PageViewedEvent = z.object({
    ...EventBase.shape,
    type: z.literal('page_viewed'),
    payload: z.object({
      page_id: z.string(),
      page_name: z.string(),
      page_index: z.number(),
      prev_page_id: z.string().optional(),
      prev_page_name: z.string().optional(),
      prev_page_index: z.number().optional(),
    }),
  })

  const PageCompletedEvent = z.object({
    ...EventBase.shape,
    type: z.literal('page_completed'),
    payload: z.object({
      page_id: z.string(),
      page_name: z.string(),
      page_index: z.number(),
      page_duration: z.number(),
    }),
  })

  const EmailCapturedEvent = z.object({
    ...EventBase.shape,
    type: z.literal('email_captured'),
    payload: z.object({
      block_id: z.string(),
      page_id: z.string(),
      page_name: z.string(),
      page_index: z.number(),
    }),
  })

  const PhoneCapturedEvent = z.object({
    ...EventBase.shape,
    type: z.literal('phone_captured'),
    payload: z.object({
      block_id: z.string(),
      page_id: z.string(),
      page_name: z.string(),
      page_index: z.number(),
    }),
  })

  const ExternalPageViewedEvent = z.object({
    ...EventBase.shape,
    type: z.literal('external_page_viewed'),
    payload: z.object({
      integration_id: z.string(),
      integration_provider: z.enum(['shopify']),
    }),
  })

  const ExternalCheckoutCompletedEvent = z.object({
    ...EventBase.shape,
    type: z.literal('external_checkout_completed'),
    payload: z.object({
      integration_id: z.string(),
      integration_provider: z.enum(['shopify']),
      external_id: z.string(),
      amount: z.number(),
      currency: z.string(),
    }),
  })

  export const Event = z.discriminatedUnion('type', [
    FunnelViewedEvent,
    FunnelStartedEvent,
    FunnelCompletedEvent,
    PageViewedEvent,
    PageCompletedEvent,
    EmailCapturedEvent,
    PhoneCapturedEvent,
    ExternalCheckoutCompletedEvent,
    ExternalPageViewedEvent,
  ])
  export type Event = z.infer<typeof Event>
}
