import { Funnel, FunnelProps } from '@/components/funnel'
import { listIntegrations } from '@/routes/(funnel)/-common'
import { head } from '@/routes/(funnel)/-head'
import { Actor } from '@shopfunnel/core/actor'
import { Analytics } from '@shopfunnel/core/analytics/index'
import { Answer } from '@shopfunnel/core/answer/index'
import { Funnel as FunnelCore } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Question } from '@shopfunnel/core/question/index'
import { Submission } from '@shopfunnel/core/submission/index'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import * as React from 'react'
import { ulid } from 'ulid'
import { z } from 'zod'

declare const fbq: ((command: 'trackCustom', eventName: string) => void) | undefined
declare const _upstack: ((command: 'track', eventName: string) => void) | undefined

const getFunnel = createServerFn()
  .inputValidator(z.object({ shortId: z.string().length(8) }))
  .handler(async ({ data }) => {
    const funnel = await FunnelCore.getPublishedVersion(data.shortId)
    if (!funnel) throw notFound()

    const host = getRequestHeader('host')
    if (host) {
      const funnelHost = new URL(funnel.url).host
      if (host !== funnelHost) throw notFound()
    }

    return funnel
  })

const listQuestions = createServerFn()
  .inputValidator(z.object({ funnelId: Identifier.schema('funnel'), workspaceId: Identifier.schema('workspace') }))
  .handler(async ({ data }) => {
    return Actor.provide('system', { workspaceId: data.workspaceId }, () => Question.list(data.funnelId))
  })

const submitAnswers = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
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
    await Actor.provide('system', { workspaceId: data.workspaceId }, () => Answer.submit(data))
  })

const completeSubmission = createServerFn()
  .inputValidator(z.object({ sessionId: z.string(), workspaceId: Identifier.schema('workspace') }))
  .handler(async ({ data }) => {
    await Actor.provide('system', { workspaceId: data.workspaceId }, async () => {
      const submissionId = await Submission.fromSessionId(data.sessionId)
      if (submissionId) {
        await Submission.complete(submissionId)
      }
    })
  })

export const Route = createFileRoute('/(funnel)/f/$funnelId')({
  component: RouteComponent,
  ssr: true,
  loader: async ({ params }) => {
    const funnel = await getFunnel({ data: { shortId: params.funnelId } })
    if (!funnel) throw notFound()

    const [questions, integrations] = await Promise.all([
      listQuestions({ data: { funnelId: funnel.id, workspaceId: funnel.workspaceId } }),
      listIntegrations({ data: { workspaceId: funnel.workspaceId } }),
    ])

    return { funnel, questions, integrations }
  },
  head: ({ loaderData }) =>
    head({
      domainSettings: loaderData?.funnel.settings,
      integrations: loaderData?.integrations,
    }),
})

function RouteComponent() {
  const { funnel, questions, integrations } = Route.useLoaderData()

  const shopifyIntegration = integrations.find((i) => i.provider === 'shopify')

  const funnelEnteredRef = React.useRef(false)
  const funnelStartedRef = React.useRef(false)

  const prevPageRef = React.useRef<{ id: string; index: number; name: string } | undefined>(undefined)

  const currentPageViewedAtRef = React.useRef<number | undefined>(undefined)
  const [currentPage, setCurrentPage] = React.useState<{ id: string; index: number; name: string } | undefined>(
    undefined,
  )

  const pendingAnswerSubmissionsRef = React.useRef<Set<Promise<unknown>>>(new Set())

  const [session] = React.useState(() => {
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
        } catch {}
      },
    }
  })

  const [visitor] = React.useState(() => {
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

  React.useEffect(() => {
    if (funnelEnteredRef.current) return
    funnelEnteredRef.current = true

    const url = new URL(window.location.href)
    url.hash = ''
    const searchParams = url.searchParams

    trackEvent('funnel_viewed', {
      document_referrer: document.referrer || undefined,
      landing_url: url.toString(),
      landing_path: url.pathname,
      landing_query: url.search.slice(1) || undefined,
      utm_source: searchParams.get('utm_source') || undefined,
      utm_medium: searchParams.get('utm_medium') || undefined,
      utm_campaign: searchParams.get('utm_campaign') || undefined,
      utm_content: searchParams.get('utm_content') || undefined,
      utm_term: searchParams.get('utm_term') || undefined,
      utm_id: searchParams.get('utm_id') || undefined,
      fbclid: searchParams.get('fbclid') || undefined,
      gclid: searchParams.get('gclid') || undefined,
      ttclid: searchParams.get('ttclid') || undefined,
      msclkid: searchParams.get('msclkid') || undefined,
      dclid: searchParams.get('dclid') || undefined,
      gbraid: searchParams.get('gbraid') || undefined,
      wbraid: searchParams.get('wbraid') || undefined,
      twclid: searchParams.get('twclid') || undefined,
      tw_source: searchParams.get('tw_source') || undefined,
      tw_campaign: searchParams.get('tw_campaign') || undefined,
      tw_adid: searchParams.get('tw_adid') || undefined,
    })
    trackMetaPixelEvent('FunnelViewed')
  }, [])

  React.useEffect(() => {
    if (!currentPage) return
    if (prevPageRef.current?.id === currentPage.id) return

    trackEvent('page_viewed', {
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
    const success = navigator.sendBeacon?.('/api/event', blob)
    if (!success) fetch('/api/event', { method: 'POST', body: blob, keepalive: true })
  }

  const trackMetaPixelEvent = (eventName: string) => {
    if (typeof _upstack !== 'undefined') {
      _upstack('track', eventName)
    } else if (typeof fbq !== 'undefined') {
      fbq('trackCustom', eventName)
    }
  }

  const handlePageChange: FunnelProps['onPageChange'] = (page) => {
    currentPageViewedAtRef.current = Date.now()
    prevPageRef.current = currentPage
    setCurrentPage(page)
  }

  const handlePageComplete: FunnelProps['onPageComplete'] = (page) => {
    if (!funnelStartedRef.current) {
      funnelStartedRef.current = true
      trackEvent('funnel_started')
      trackMetaPixelEvent('FunnelStarted')
    }

    const questionsByBlockId = new Map(questions.map((q) => [q.blockId, q]))
    for (const [blockId, value] of Object.entries(page.values)) {
      const question = questionsByBlockId.get(blockId)
      if (!question) continue
      trackEvent('question_answered', {
        page_id: page.id,
        question_id: question.id,
        question_type: question.type,
        question_title: question.title,
        ...(typeof value === 'string' && { answer_value_text: value }),
        ...(typeof value === 'number' && { answer_value_number: value }),
        ...(Array.isArray(value) && { answer_value_option_ids: value }),
      })
    }

    trackEvent('page_completed', {
      page_id: page.id,
      page_index: page.index,
      page_name: page.name,
      page_duration: currentPageViewedAtRef.current ? Date.now() - currentPageViewedAtRef.current : 0,
    })

    if (Object.keys(page.values).length > 0) {
      const promise = submitAnswers({
        data: {
          workspaceId: funnel.workspaceId,
          funnelId: funnel.id,
          sessionId: session.id(),
          answers: Object.entries(page.values).map(([blockId, value]) => ({ blockId, value })),
        },
      })
      pendingAnswerSubmissionsRef.current.add(promise)
      promise.finally(() => pendingAnswerSubmissionsRef.current.delete(promise))
    }
  }

  const handleComplete: FunnelProps['onComplete'] = async (values, redirectUrl) => {
    const sessionId = session.id()
    const visitorId = visitor.id()

    await Promise.allSettled([...pendingAnswerSubmissionsRef.current])
    await completeSubmission({ data: { sessionId, workspaceId: funnel.workspaceId } })

    trackEvent('funnel_completed')
    trackMetaPixelEvent('FunnelCompleted')

    funnelEnteredRef.current = false
    funnelStartedRef.current = false
    currentPageViewedAtRef.current = undefined
    prevPageRef.current = undefined
    setCurrentPage(undefined)
    session.clear()

    if (redirectUrl) {
      const url = new URL(redirectUrl, window.location.origin)

      const searchPrams = new URLSearchParams(window.location.search)
      for (const [key, value] of searchPrams) {
        if (url.searchParams.has(key)) continue
        url.searchParams.set(key, value)
      }

      if (shopifyIntegration) {
        url.searchParams.set(
          '_sfs',
          btoa(
            JSON.stringify({
              id: sessionId,
              visitorId,
              workspaceId: funnel.workspaceId,
              funnelId: funnel.id,
              funnelVersion: funnel.version,
              integrationId: shopifyIntegration.id,
              integrationProvider: shopifyIntegration.provider,
            }),
          ),
        )
      }

      window.location.href = url.toString()
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Funnel
        funnel={funnel}
        mode="live"
        onPageChange={handlePageChange}
        onPageComplete={handlePageComplete}
        onComplete={handleComplete}
      />
    </div>
  )
}
