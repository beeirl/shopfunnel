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

  const StepEvent = BaseEvent.extend({
    step_id: z.string(),
    step_index: z.number(),
    step_name: z.string(),
  })

  export const QuizEvent = z.discriminatedUnion('type', [
    BaseEvent.extend({ type: z.literal('quiz_view') }),
    BaseEvent.extend({ type: z.literal('quiz_start') }),
    StepEvent.extend({ type: z.literal('step_view') }),
    StepEvent.extend({ type: z.literal('step_complete'), duration: z.number() }),
    StepEvent.extend({
      type: z.literal('question_answer'),
      block_id: z.string(),
      block_type: z.string(),
      duration: z.number(),
    }),
  ])

  export type QuizEvent = z.infer<typeof QuizEvent>
}
