import { z } from 'zod'

export namespace Analytics {
  const EventBase = z.object({
    visitor_id: z.string(),
    session_id: z.string(),
    workspace_id: z.string(),
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

  const QuestionAnsweredEvent = z.object({
    ...EventBase.shape,
    type: z.literal('question_answered'),
    payload: z.object({
      page_id: z.string(),
      question_id: z.string(),
      question_title: z.string(),
      question_type: z.string(),
      answer_value_text: z.string().optional(),
      answer_value_number: z.number().optional(),
      answer_value_option_ids: z.array(z.string()).optional(),
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
    QuestionAnsweredEvent,
    ExternalCheckoutCompletedEvent,
    ExternalPageViewedEvent,
  ])
  export type Event = z.infer<typeof Event>
}
