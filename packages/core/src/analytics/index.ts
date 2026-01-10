import { z } from 'zod'

export namespace Analytics {
  export const EventBase = z.object({
    quiz_id: z.string(),
    quiz_version: z.number(),
    workspace_id: z.string(),
    session_id: z.string(),
    visitor_id: z.string(),
    timestamp: z.string(),
    device: z.enum(['mobile', 'desktop']).optional(),
    os: z.string().optional(),
    browser: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    referrer: z.string().optional(),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_term: z.string().optional(),
    utm_content: z.string().optional(),
  })
  export type EventBase = z.infer<typeof EventBase>

  const QuizViewEvent = z.object({
    ...EventBase.shape,
    type: z.literal('quiz_view'),
  })

  const QuizStartEvent = z.object({
    ...EventBase.shape,
    type: z.literal('quiz_start'),
  })

  const QuizCompleteEvent = z.object({
    ...EventBase.shape,
    type: z.literal('quiz_complete'),
  })

  const PageViewEvent = z.object({
    ...EventBase.shape,
    type: z.literal('page_view'),
    prev_page_id: z.string().optional(),
    prev_page_name: z.string().optional(),
    prev_page_index: z.number().optional(),
    page_id: z.string(),
    page_index: z.number(),
    page_name: z.string(),
  })

  const PageCompleteEvent = z.object({
    ...EventBase.shape,
    type: z.literal('page_complete'),
    prev_page_id: z.string().optional(),
    prev_page_name: z.string().optional(),
    prev_page_index: z.number().optional(),
    page_id: z.string(),
    page_index: z.number(),
    page_name: z.string(),
    page_duration: z.number(),
  })

  const QuestionAnswerEvent = z.object({
    ...EventBase.shape,
    type: z.literal('question_answer'),
    prev_page_id: z.string().optional(),
    prev_page_name: z.string().optional(),
    prev_page_index: z.number().optional(),
    page_id: z.string(),
    page_name: z.string(),
    question_id: z.string(),
    question_title: z.string(),
    question_type: z.string(),
    answer_value_text: z.string().optional(),
    answer_value_number: z.number().optional(),
    answer_value_option_ids: z.array(z.string()).optional(),
  })

  export const Event = z.discriminatedUnion('type', [
    QuizViewEvent,
    QuizStartEvent,
    QuizCompleteEvent,
    PageViewEvent,
    PageCompleteEvent,
    QuestionAnswerEvent,
  ])
  export type Event = z.infer<typeof Event>
}
