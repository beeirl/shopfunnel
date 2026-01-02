import { Quiz, type Values } from '@/components/quiz'
import { Analytics } from '@shopfunnel/core/analytics/index'
import { Answer } from '@shopfunnel/core/answer/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Quiz as QuizCore } from '@shopfunnel/core/quiz/index'
import { INPUT_BLOCKS } from '@shopfunnel/core/quiz/types'
import { Submission } from '@shopfunnel/core/submission/index'
import { Resource } from '@shopfunnel/resource'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ulid } from 'ulid'
import { z } from 'zod'

const getQuiz = createServerFn()
  .inputValidator(z.object({ shortId: z.string().length(8) }))
  .handler(async ({ data }) => {
    const quiz = await QuizCore.getPublishedVersion(data.shortId)
    if (!quiz) throw notFound()
    return quiz
  })

const getQuizQueryOptions = (shortId: string) =>
  queryOptions({
    queryKey: ['quiz', 'published', shortId],
    queryFn: () => getQuiz({ data: { shortId } }),
  })

const submitAnswers = createServerFn()
  .inputValidator(
    z.object({
      quizId: Identifier.schema('quiz'),
      sessionId: z.string(),
      answers: z.array(
        z.object({
          blockId: z.string(),
          value: z.unknown(),
          duration: z.number().optional(),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    await Answer.submit(data)
  })

const completeSubmission = createServerFn()
  .inputValidator(z.object({ sessionId: z.string() }))
  .handler(async ({ data }) => {
    const submissionId = await Submission.fromSessionId(data.sessionId)
    if (submissionId) {
      await Submission.complete(submissionId)
    }
  })

const trackEvents = createServerFn()
  .inputValidator(z.array(Analytics.QuizEvent))
  .handler(async ({ data }) => {
    await Resource.AnalyticsQueue.sendBatch(data.map((event) => ({ body: event })))
  })

export const Route = createFileRoute('/(quiz)/q/$id')({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getQuizQueryOptions(params.id))
  },
})

function RouteComponent() {
  const params = Route.useParams()

  const VISITOR_STORAGE_KEY = 'sf_visitor_id'
  const SESSION_STORAGE_KEY = `sf_quiz_${params.id}_session_id`

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [visitorId, setVisitorId] = useState<string | null>(null)

  const quizQuery = useSuspenseQuery(getQuizQueryOptions(params.id))
  const quiz = quizQuery.data

  const quizViewedRef = useRef(false)
  const quizStartedRef = useRef(false)
  const stepViewedAtRef = useRef<number>(Date.now())

  useEffect(() => {
    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY)
    const sessionId = storedSessionId ?? ulid()
    if (!storedSessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
    }
    setSessionId(sessionId)
  }, [SESSION_STORAGE_KEY])

  useEffect(() => {
    const storedVisitorId = localStorage.getItem(VISITOR_STORAGE_KEY)
    const visitorId = storedVisitorId ?? ulid()
    if (!storedVisitorId) {
      localStorage.setItem(VISITOR_STORAGE_KEY, visitorId)
    }
    setVisitorId(visitorId)
  }, [])

  useEffect(() => {
    if (!sessionId || !visitorId || quizViewedRef.current) return
    quizViewedRef.current = true
    trackEvents({
      data: [
        {
          type: 'quiz_view',
          quiz_id: quiz.id,
          quiz_version: quiz.version,
          workspace_id: quiz.workspaceId,
          session_id: sessionId,
          visitor_id: visitorId,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  }, [sessionId, visitorId, quiz.id, quiz.version, quiz.workspaceId])

  const handleStepChange = useCallback(
    (step: { id: string; index: number; name: string }) => {
      stepViewedAtRef.current = Date.now()

      if (!sessionId || !visitorId) return

      trackEvents({
        data: [
          {
            type: 'step_view',
            quiz_id: quiz.id,
            quiz_version: quiz.version,
            workspace_id: quiz.workspaceId,
            session_id: sessionId,
            visitor_id: visitorId,
            step_id: step.id,
            step_index: step.index,
            step_name: step.name,
            timestamp: new Date().toISOString(),
          },
        ],
      })
    },
    [sessionId, visitorId, quiz.id, quiz.version, quiz.workspaceId],
  )

  const handleStepComplete = async (step: { id: string; index: number; name: string; values: Values }) => {
    if (!sessionId || !visitorId) return

    const baseEvent = {
      quiz_id: quiz.id,
      quiz_version: quiz.version,
      workspace_id: quiz.workspaceId,
      session_id: sessionId,
      visitor_id: visitorId,
      timestamp: new Date().toISOString(),
    }

    const events: Analytics.QuizEvent[] = []

    if (!quizStartedRef.current) {
      quizStartedRef.current = true
      events.push({ ...baseEvent, type: 'quiz_start' })
    }

    const duration = Date.now() - stepViewedAtRef.current

    const quizStep = quiz.steps[step.index]
    const blocksById = new Map(quizStep?.blocks.map((b) => [b.id, b]) ?? [])
    for (const [blockId] of Object.entries(step.values)) {
      const block = blocksById.get(blockId)
      if (block && INPUT_BLOCKS.includes(block.type as (typeof INPUT_BLOCKS)[number])) {
        events.push({
          ...baseEvent,
          type: 'question_answer',
          step_id: step.id,
          step_index: step.index,
          step_name: step.name,
          block_id: blockId,
          block_type: block.type,
          duration,
        })
      }
    }

    events.push({
      ...baseEvent,
      type: 'step_complete',
      step_id: step.id,
      step_index: step.index,
      step_name: step.name,
      duration,
    })

    if (Object.entries(step.values).length) {
      await submitAnswers({
        data: {
          quizId: quiz.id,
          sessionId,
          answers: Object.entries(step.values).map(([blockId, value]) => ({
            blockId,
            value,
            duration,
          })),
        },
      })
    }

    if (events.length > 0) {
      await trackEvents({ data: events })
    }
  }

  const handleComplete = async () => {
    if (sessionId) {
      await completeSubmission({
        data: { sessionId },
      })
      localStorage.removeItem(SESSION_STORAGE_KEY)
      setSessionId(null)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Quiz
        quiz={quiz}
        mode="live"
        onStepChange={handleStepChange}
        onStepComplete={handleStepComplete}
        onComplete={handleComplete}
      />
    </div>
  )
}
