import { Funnel, FunnelProps } from '@/components/funnel'
import { Analytics } from '@shopfunnel/core/analytics/index'
import { Answer } from '@shopfunnel/core/answer/index'
import { Domain } from '@shopfunnel/core/domain/index'
import { Funnel as FunnelCore } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Question } from '@shopfunnel/core/question/index'
import { Submission } from '@shopfunnel/core/submission/index'
import { Resource } from '@shopfunnel/resource'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { useEffect, useRef, useState } from 'react'
import { UAParser } from 'ua-parser-js'
import { ulid } from 'ulid'
import { z } from 'zod'

const getFunnel = createServerFn()
  .inputValidator(z.object({ shortId: z.string().length(8) }))
  .handler(async ({ data }) => {
    const funnel = await FunnelCore.getPublishedVersion(data.shortId)
    if (!funnel) throw notFound()

    const stage = process.env.SST_STAGE
    const domain = process.env.DOMAIN
    const host = getRequestHeader('host')
    if (stage === 'production' && domain && host && !host.endsWith(domain)) {
      const customDomain = await Domain.fromHostname(host)
      if (!customDomain || customDomain.workspaceId !== funnel.workspaceId) {
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

const trackEvents = createServerFn()
  .inputValidator(z.array(Analytics.Event))
  .handler(async ({ data }) => {
    await Resource.AnalyticsQueue.sendBatch(
      data.map((event) => {
        if (event.type === 'funnel_view') {
          const userAgent = getRequestHeader('user-agent') || ''
          const country = getRequestHeader('cf-ipcountry') || undefined
          const region = getRequestHeader('cf-region') || undefined
          const city = getRequestHeader('cf-ipcity') || undefined
          const referrer = getRequestHeader('referer') || undefined

          const parser = new UAParser(userAgent)
          const os = parser.getOS().name || undefined
          const browser = parser.getBrowser().name || undefined
          const deviceType = parser.getDevice().type
          const device: 'mobile' | 'desktop' = deviceType === 'mobile' || deviceType === 'tablet' ? 'mobile' : 'desktop'

          return {
            body: {
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
            },
          }
        }
        return { body: event }
      }),
    )
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

  const funnelViewedRef = useRef(false)
  const funnelStartedRef = useRef(false)

  const prevPageRef = useRef<{ id: string; index: number; name: string } | undefined>(undefined)

  const currentPageViewedAtRef = useRef<number | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState<{ id: string; index: number; name: string } | undefined>(undefined)

  const [session] = useState(() => {
    const key = `sf_funnel_${funnel.shortId}_session_id`
    return {
      id: () => {
        let id = localStorage.getItem(key)
        if (!id) {
          id = ulid()
          localStorage.setItem(key, id)
        }
        return id
      },
      clear: () => localStorage.removeItem(key),
    }
  })

  const [visitor] = useState(() => {
    const key = 'sf_visitor_id'
    return {
      id: () => {
        let id = localStorage.getItem(key)
        if (!id) {
          id = ulid()
          localStorage.setItem(key, id)
        }
        return id
      },
    }
  })

  const [queue] = useState(() => {
    const items: Promise<unknown>[] = []
    return {
      push: (item: Promise<unknown>) => {
        items.push(item)
      },
      flush: () => Promise.all(items),
    }
  })

  const [event] = useState(() => {
    type Event = Pick<Analytics.Event, 'type' | 'payload'>
    const events: Event[] = []
    return {
      track: (type: Event['type'], payload: Event['payload'] = {}) => {
        const shouldBatch = events.length === 0
        events.push({ type, payload })
        if (shouldBatch) {
          queueMicrotask(() => {
            queue.push(
              trackEvents({
                data: events.splice(0).map((e) => ({
                  type: e.type,
                  visitor_id: visitor.id(),
                  session_id: session.id(),
                  workspace_id: funnel.workspaceId,
                  funnel_id: funnel.id,
                  funnel_version: funnel.version,
                  version: '1',
                  payload: e.payload,
                  timestamp: new Date().toISOString(),
                })) as Analytics.Event[],
              }),
            )
          })
        }
      },
    }
  })

  useEffect(() => {
    if (funnelViewedRef.current) return
    funnelViewedRef.current = true
    event.track('funnel_view')
  }, [])

  useEffect(() => {
    if (!currentPage) return
    event.track('page_view', {
      prev_page_id: prevPageRef.current?.id,
      prev_page_index: prevPageRef.current?.index,
      prev_page_name: prevPageRef.current?.name,
      page_id: currentPage.id,
      page_index: currentPage.index,
      page_name: currentPage.name,
    })
  }, [currentPage])

  const handlePageChange: FunnelProps['onPageChange'] = (page) => {
    currentPageViewedAtRef.current = Date.now()
    prevPageRef.current = currentPage
    setCurrentPage(page)
  }

  const handlePageComplete: FunnelProps['onPageComplete'] = (page) => {
    if (!funnelStartedRef.current) {
      funnelStartedRef.current = true
      event.track('funnel_start')
    }

    const questionsByBlockId = new Map(questions.map((q) => [q.blockId, q]))
    for (const [blockId, value] of Object.entries(page.values)) {
      const question = questionsByBlockId.get(blockId)
      if (!question) continue
      event.track('question_answer', {
        page_id: page.id,
        question_id: question.id,
        question_type: question.type,
        question_title: question.title,
        ...(typeof value === 'string' && { answer_value_text: value }),
        ...(typeof value === 'number' && { answer_value_number: value }),
        ...(Array.isArray(value) && { answer_value_option_ids: value }),
      })
    }

    event.track('page_complete', {
      page_id: page.id,
      page_index: page.index,
      page_name: page.name,
      page_duration: currentPageViewedAtRef.current ? Date.now() - currentPageViewedAtRef.current : 0,
    })

    if (Object.keys(page.values).length > 0) {
      queue.push(
        submitAnswers({
          data: {
            funnelId: funnel.id,
            sessionId: session.id(),
            answers: Object.entries(page.values).map(([blockId, value]) => ({ blockId, value })),
          },
        }),
      )
    }
  }

  const handleFunnelComplete: FunnelProps['onComplete'] = async () => {
    event.track('funnel_complete')
    queue.push(completeSubmission({ data: { sessionId: session.id() } }))
    await queue.flush()
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
