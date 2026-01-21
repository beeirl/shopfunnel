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

  const FunnelEnterEvent = z.object({
    ...EventBase.shape,
    type: z.literal('funnel_enter'),
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

  const FunnelStartEvent = z.object({
    ...EventBase.shape,
    type: z.literal('funnel_start'),
    payload: z.object({}),
  })

  const FunnelEndEvent = z.object({
    ...EventBase.shape,
    type: z.literal('funnel_end'),
    payload: z.object({}),
  })

  const PageViewEvent = z.object({
    ...EventBase.shape,
    type: z.literal('page_view'),
    payload: z.object({
      page_id: z.string(),
      page_name: z.string(),
      page_index: z.number(),
      prev_page_id: z.string().optional(),
      prev_page_name: z.string().optional(),
      prev_page_index: z.number().optional(),
    }),
  })

  const PageCompleteEvent = z.object({
    ...EventBase.shape,
    type: z.literal('page_complete'),
    payload: z.object({
      page_id: z.string(),
      page_name: z.string(),
      page_index: z.number(),
      page_duration: z.number(),
    }),
  })

  const QuestionAnswerEvent = z.object({
    ...EventBase.shape,
    type: z.literal('question_answer'),
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

  const ExternalPageViewEvent = z.object({
    ...EventBase.shape,
    type: z.literal('external_page_view'),
    payload: z.object({
      integration_id: z.string(),
      integration_provider: z.enum(['shopify']),
    }),
  })

  const ExternalCheckoutCompleteEvent = z.object({
    ...EventBase.shape,
    type: z.literal('external_checkout_complete'),
    payload: z.object({
      integration_id: z.string(),
      integration_provider: z.enum(['shopify']),
      external_id: z.string(),
      amount: z.number(),
      currency: z.string(),
    }),
  })

  export const Event = z.discriminatedUnion('type', [
    FunnelEnterEvent,
    FunnelStartEvent,
    FunnelEndEvent,
    PageViewEvent,
    PageCompleteEvent,
    QuestionAnswerEvent,
    ExternalCheckoutCompleteEvent,
    ExternalPageViewEvent,
  ])
  export type Event = z.infer<typeof Event>
}
