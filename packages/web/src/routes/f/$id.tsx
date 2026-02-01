import { Funnel, FunnelProps } from '@/components/funnel'
import { Actor } from '@shopfunnel/core/actor'
import { Analytics } from '@shopfunnel/core/analytics/index'
import { Answer } from '@shopfunnel/core/answer/index'
import { Domain } from '@shopfunnel/core/domain/index'
import { Funnel as FunnelCore } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Integration } from '@shopfunnel/core/integration/index'
import { Question } from '@shopfunnel/core/question/index'
import { Submission } from '@shopfunnel/core/submission/index'
import { AnyRouteMatch, createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { useEffect, useRef, useState } from 'react'
import { ulid } from 'ulid'
import { z } from 'zod'

declare const fbq: ((command: 'trackCustom', eventName: string) => void) | undefined
declare const _upstack: ((command: 'track', eventName: string) => void) | undefined

// prettier-ignore
const SCRIPTS = {
  metaPixel: (metaPixelId: string) => `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`
}

const getFunnel = createServerFn()
  .inputValidator(z.object({ shortId: z.string().length(8) }))
  .handler(async ({ data }) => {
    const funnel = await FunnelCore.getPublishedVersion(data.shortId)
    if (!funnel) throw notFound()

    const appStage = process.env.VITE_STAGE
    const appDomain = process.env.VITE_DOMAIN
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

const getShopifyIntegration = createServerFn()
  .inputValidator(z.object({ workspaceId: Identifier.schema('workspace') }))
  .handler(async ({ data }) => {
    const integration = await Actor.provide('system', { workspaceId: data.workspaceId }, () =>
      Integration.fromProvider('shopify'),
    )
    return integration ?? null
  })

export const Route = createFileRoute('/f/$id')({
  component: RouteComponent,
  loader: async ({ params }) => {
    const funnel = await getFunnel({ data: { shortId: params.id } })
    if (!funnel) throw notFound()

    const [questions, shopifyIntegration] = await Promise.all([
      getQuestions({ data: { funnelId: funnel.id } }),
      getShopifyIntegration({ data: { workspaceId: funnel.workspaceId } }),
    ])

    return { funnel, questions, shopifyIntegration }
  },
  head: ({ loaderData }) => {
    const scripts: AnyRouteMatch['headScripts'] = []
    const links: AnyRouteMatch['links'] = []

    const title = loaderData?.funnel.title

    const favicon = loaderData?.funnel.theme?.favicon
    if (favicon) links.push({ rel: 'icon', href: favicon })

    if (loaderData?.funnel.workspaceId === 'wrk_01KEWFQB218VAN76CCRVJV2RQ2') {
      // prettier-ignore
      scripts.push({ children: `window._adqLoaded=0;window._upsqueue=window._upsqueue||[];window._upstack=window._upstack||function(){window._upsqueue.push(arguments);};window._upstack('init','919f42b8-b4de-40f8-b2e3-bc7af67609a6');window._upstack('page');` })
      scripts.push({ src: 'https://prod2-cdn.upstackified.com/scripts/px/ups.min.js', defer: true })
    } else {
      const metaPixelId = loaderData?.funnel.settings.metaPixelId
      if (metaPixelId) scripts.push({ children: SCRIPTS.metaPixel(metaPixelId) })
    }

    return { meta: [{ title }], scripts, links }
  },
})

function RouteComponent() {
  const { funnel, questions, shopifyIntegration } = Route.useLoaderData()

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
        } catch {}
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
    if (funnelEnteredRef.current) return
    funnelEnteredRef.current = true
    trackEvent('funnel_viewed')
  }, [])

  useEffect(() => {
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

    await Promise.allSettled(pendingAnswerSubmissionsRef.current)
    await completeSubmission({ data: { sessionId } })

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
