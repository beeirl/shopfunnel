import { z } from 'zod'

export namespace Analytics {
  const BaseEvent = z.object({
    quiz_id: z.string(),
    quiz_version: z.number(),
    workspace_id: z.string(),
    session_id: z.string(),
    visitor_id: z.string(),
    timestamp: z.string(),
  })

  const PageEvent = BaseEvent.extend({
    page_id: z.string(),
    page_name: z.string(),
    page_depth: z.number(),
    from_page_id: z.string().nullable(),
  })

  export const QuizEvent = z.discriminatedUnion('type', [
    BaseEvent.extend({ type: z.literal('quiz_view') }),
    BaseEvent.extend({ type: z.literal('quiz_start') }),
    BaseEvent.extend({ type: z.literal('quiz_complete') }),
    PageEvent.extend({ type: z.literal('page_view') }),
    PageEvent.extend({ type: z.literal('page_complete'), duration: z.number() }),
    PageEvent.extend({
      type: z.literal('question_answer'),
      block_id: z.string(),
      block_type: z.string(),
      duration: z.number(),
    }),
  ])

  export type QuizEvent = z.infer<typeof QuizEvent>
}
