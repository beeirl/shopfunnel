import { Funnel, FunnelProps } from '@/components/funnel'
import { Analytics } from '@shopfunnel/core/analytics/index'
import { Answer } from '@shopfunnel/core/answer/index'
import { Domain } from '@shopfunnel/core/domain/index'
import { Funnel as FunnelCore } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Question } from '@shopfunnel/core/question/index'
import { Submission } from '@shopfunnel/core/submission/index'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { useEffect, useRef, useState } from 'react'
import { ulid } from 'ulid'
import { z } from 'zod'

const getFunnel = createServerFn()
  .inputValidator(z.object({ shortId: z.string().length(8) }))
  .handler(async ({ data }) => {
    const funnel = await FunnelCore.getPublishedVersion(data.shortId)
    if (!funnel) throw notFound()

    const appStage = process.env.APP_STAGE
    const appDomain = process.env.APP_DOMAIN
    const host = getRequestHeader('host')
    if (appStage === 'production' && appDomain && host && !host.endsWith(appDomain)) {
      const domain = await Domain.fromHostname(host)
      if (!domain || domain.workspaceId !== funnel.workspaceId) {
        throw notFound()
      }
    }

    return funnel
  })

const getQuestions = createServerFn()
  .inputValidator(z.object({ funnelId: Identifier.schema('funnel') }))
  .handler(async ({ data }) => {
    return Question.list(data.funnelId)
  })

const submitAnswers = createServerFn()
  .inputValidator(
    z.object({
      funnelId: Identifier.schema('funnel'),
      sessionId: z.string(),
      answers: z.array(
        z.object({
          blockId: z.string(),
          value: z.unknown(),
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

export const Route = createFileRoute('/(funnel)/f/$id')({
  component: RouteComponent,
  loader: async ({ params }) => {
    const funnel = await getFunnel({ data: { shortId: params.id } })
    if (!funnel) throw notFound()
    const questions = await getQuestions({ data: { funnelId: funnel.id } })
    return { funnel, questions }
  },
})

function RouteComponent() {
  const { funnel, questions } = Route.useLoaderData()

  const funnelEnteredRef = useRef(false)
  const funnelStartedRef = useRef(false)

  const prevPageRef = useRef<{ id: string; index: number; name: string } | undefined>(undefined)

  const currentPageViewedAtRef = useRef<number | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState<{ id: string; index: number; name: string } | undefined>(undefined)

  const pendingAnswerSubmissionsRef = useRef<Set<Promise<unknown>>>(new Set())

  const [session] = useState(() => {
    let id: string | undefined
    const key = `sf_funnel_${funnel.shortId}_session_id`
    return {
      id: () => {
        if (!id) {
          try {
            const storedId = localStorage.getItem(key)
            id = storedId ?? ulid()
            if (!storedId) localStorage.setItem(key, id)
          } catch {
            id = ulid()
          }
        }
        return id
      },
      clear: () => {
        try {
          id = undefined
          localStorage.removeItem(key)
        } catch {
          // noop
        }
      },
    }
  })

  const [visitor] = useState(() => {
    let id: string | undefined
    const key = 'sf_visitor_id'
    return {
      id: () => {
        if (!id) {
          try {
            const storedId = localStorage.getItem(key)
            id = storedId ?? ulid()
            if (!storedId) localStorage.setItem(key, id)
          } catch {
            id = ulid()
          }
        }
        return id
      },
    }
  })

  useEffect(() => {
    const handlePageHide = () => trackEvent('funnel_exit')
    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [])

  useEffect(() => {
    if (funnelEnteredRef.current) return
    funnelEnteredRef.current = true
    trackEvent('funnel_enter')
  }, [])

  useEffect(() => {
    if (!currentPage) return
    trackEvent('page_view', {
      prev_page_id: prevPageRef.current?.id,
      prev_page_index: prevPageRef.current?.index,
      prev_page_name: prevPageRef.current?.name,
      page_id: currentPage.id,
      page_index: currentPage.index,
      page_name: currentPage.name,
    })
  }, [currentPage])

  const trackEvent = (type: Analytics.Event['type'], payload: Analytics.Event['payload'] = {}) => {
    const event = {
      type,
      visitor_id: visitor.id(),
      session_id: session.id(),
      workspace_id: funnel.workspaceId,
      funnel_id: funnel.id,
      funnel_version: funnel.version,
      version: '1',
      payload,
      timestamp: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(event)], { type: 'application/json' })
    const success = navigator.sendBeacon?.('/f/event', blob)
    if (!success) fetch('/f/event', { method: 'POST', body: blob, keepalive: true })
  }

  const handlePageChange: FunnelProps['onPageChange'] = (page) => {
    currentPageViewedAtRef.current = Date.now()
    prevPageRef.current = currentPage
    setCurrentPage(page)
  }

  const handlePageComplete: FunnelProps['onPageComplete'] = (page) => {
    if (!funnelStartedRef.current) {
      funnelStartedRef.current = true
      trackEvent('funnel_start')
    }

    const questionsByBlockId = new Map(questions.map((q) => [q.blockId, q]))
    for (const [blockId, value] of Object.entries(page.values)) {
      const question = questionsByBlockId.get(blockId)
      if (!question) continue
      trackEvent('question_answer', {
        page_id: page.id,
        question_id: question.id,
        question_type: question.type,
        question_title: question.title,
        ...(typeof value === 'string' && { answer_value_text: value }),
        ...(typeof value === 'number' && { answer_value_number: value }),
        ...(Array.isArray(value) && { answer_value_option_ids: value }),
      })
    }

    trackEvent('page_complete', {
      page_id: page.id,
      page_index: page.index,
      page_name: page.name,
      page_duration: currentPageViewedAtRef.current ? Date.now() - currentPageViewedAtRef.current : 0,
    })

    if (Object.keys(page.values).length > 0) {
      const promise = submitAnswers({
        data: {
          funnelId: funnel.id,
          sessionId: session.id(),
          answers: Object.entries(page.values).map(([blockId, value]) => ({ blockId, value })),
        },
      })
      pendingAnswerSubmissionsRef.current.add(promise)
      promise.finally(() => pendingAnswerSubmissionsRef.current.delete(promise))
    }
  }

  const handleFunnelComplete: FunnelProps['onComplete'] = async () => {
    await Promise.allSettled(pendingAnswerSubmissionsRef.current)
    await completeSubmission({ data: { sessionId: session.id() } })

    trackEvent('funnel_end')

    funnelEnteredRef.current = false
    funnelStartedRef.current = false
    currentPageViewedAtRef.current = undefined
    prevPageRef.current = undefined
    setCurrentPage(undefined)
    session.clear()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Funnel
        funnel={funnel}
        mode="live"
        onPageChange={handlePageChange}
        onPageComplete={handlePageComplete}
        onComplete={handleFunnelComplete}
      />
    </div>
  )
}
