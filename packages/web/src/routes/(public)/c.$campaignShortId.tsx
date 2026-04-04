import { Funnel, type FunnelProps } from '@/components/funnel'
import { listIntegrations } from '@/routes/(public)/-common'
import { head } from '@/routes/(public)/-head'
import { Actor } from '@shopfunnel/core/actor'
import { Analytics } from '@shopfunnel/core/analytics/index'
import { Answer } from '@shopfunnel/core/answer/index'
import { CampaignTable } from '@shopfunnel/core/campaign/index.sql'
import { Database } from '@shopfunnel/core/database/index'
import { ExperimentTable, ExperimentVariantTable } from '@shopfunnel/core/experiment/index.sql'
import { Funnel as FunnelCore } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { Submission } from '@shopfunnel/core/submission/index'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie, getRequestHeader, setCookie } from '@tanstack/react-start/server'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import * as React from 'react'
import { ulid } from 'ulid'
import { z } from 'zod'

declare function fbq(command: 'init', pixelId: string, advancedMatching?: { external_id?: string }): void
declare function fbq(
  command: 'track',
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string },
): void
declare function fbq(
  command: 'trackCustom',
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string },
): void
declare const _upstack: ((command: 'track', eventName: string) => void) | undefined

const getFunnel = createServerFn()
  .inputValidator(z.object({ campaignShortId: z.string().length(8) }))
  .handler(async ({ data }) => {
    const cookieName = `sf_campaign_${data.campaignShortId}_variant_id`

    const rows = await Database.use((tx) =>
      tx
        .select({
          campaignId: CampaignTable.id,
          campaignShortId: CampaignTable.shortId,
          workspaceId: CampaignTable.workspaceId,
          defaultFunnelId: CampaignTable.defaultFunnelId,
          experimentId: ExperimentTable.id,
          experimentVariantId: ExperimentVariantTable.id,
          experimentVariantFunnelId: ExperimentVariantTable.funnelId,
          experimentVariantWeight: ExperimentVariantTable.weight,
        })
        .from(CampaignTable)
        .leftJoin(
          ExperimentTable,
          and(
            eq(ExperimentTable.workspaceId, CampaignTable.workspaceId),
            eq(ExperimentTable.campaignId, CampaignTable.id),
            isNotNull(ExperimentTable.startedAt),
            isNull(ExperimentTable.endedAt),
            isNull(ExperimentTable.archivedAt),
          ),
        )
        .leftJoin(
          ExperimentVariantTable,
          and(
            eq(ExperimentVariantTable.workspaceId, ExperimentTable.workspaceId),
            eq(ExperimentVariantTable.experimentId, ExperimentTable.id),
          ),
        )
        .where(and(eq(CampaignTable.shortId, data.campaignShortId), isNull(CampaignTable.archivedAt))),
    )
    if (rows.length === 0) throw notFound()

    const campaign = rows[0]
    if (!campaign) throw notFound()

    const activeVariants = rows
      .filter(
        (row) =>
          row.experimentId !== null &&
          row.experimentVariantId !== null &&
          row.experimentVariantFunnelId !== null &&
          row.experimentVariantWeight !== null &&
          row.experimentVariantWeight > 0,
      )
      .map((row) => ({
        experimentId: row.experimentId!,
        variantId: row.experimentVariantId!,
        funnelId: row.experimentVariantFunnelId!,
        weight: row.experimentVariantWeight!,
      }))

    let experimentId: string | null = null
    let experimentVariantId: string | null = null
    let funnelId = campaign.defaultFunnelId

    if (activeVariants.length > 0) {
      const assignedVariantId = getCookie(cookieName)
      const assignedVariant = activeVariants.find((variant) => variant.variantId === assignedVariantId)

      const variant = (() => {
        if (assignedVariant) return assignedVariant

        const totalWeight = activeVariants.reduce((sum, current) => sum + current.weight, 0)
        const rand = Math.random() * totalWeight
        let cumulative = 0

        for (const current of activeVariants) {
          cumulative += current.weight
          if (rand < cumulative) return current
        }

        return activeVariants[activeVariants.length - 1] ?? null
      })()

      if (!variant) throw notFound()

      experimentId = variant.experimentId
      experimentVariantId = variant.variantId
      funnelId = variant.funnelId

      setCookie(cookieName, variant.variantId, {
        maxAge: 60 * 60 * 24 * 365 * 10,
        path: '/',
        sameSite: 'lax',
      })
    }

    if (!funnelId) throw notFound()

    const funnel = await FunnelCore.getPublishedVersion(funnelId)
    if (!funnel) throw notFound()

    const host = getRequestHeader('host')
    if (host && host !== new URL(funnel.url).host) throw notFound()

    return {
      campaignId: campaign.campaignId,
      campaignShortId: campaign.campaignShortId,
      experimentId,
      experimentVariantId,
      funnel,
    }
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
  .inputValidator(
    z.object({
      campaignShortId: z.string().length(8),
      workspaceId: Identifier.schema('workspace'),
      sessionId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    await Actor.provide('system', { workspaceId: data.workspaceId }, async () => {
      const submissionId = await Submission.fromSessionId(data.sessionId)
      if (submissionId) await Submission.complete(submissionId)
    })
    deleteCookie(`sf_campaign_${data.campaignShortId}_variant_id`)
  })

export const Route = createFileRoute('/(public)/c/$campaignShortId')({
  component: RouteComponent,
  ssr: true,
  loader: async ({ params }) => {
    const funnel = await getFunnel({ data: { campaignShortId: params.campaignShortId } })
    if (!funnel) throw notFound()

    const integrations = await listIntegrations({ data: { workspaceId: funnel.funnel.workspaceId } })

    return { funnel, integrations }
  },
  head: ({ loaderData }) =>
    head({
      domainSettings: loaderData?.funnel.funnel.settings,
      integrations: loaderData?.integrations,
    }),
})

function RouteComponent() {
  const { funnel, integrations } = Route.useLoaderData()

  const shopifyIntegration = integrations.find((integration) => integration.provider === 'shopify')
  const metaPixelIntegration = integrations.find((i) => i.provider === 'meta_pixel')

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
    const key = `sf_funnel_${funnel.funnel.shortId}_session_id`

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
    const pixelId = (metaPixelIntegration?.metadata as { pixelId: string } | undefined)?.pixelId
    if (typeof fbq !== 'undefined' && pixelId) {
      fbq('init', pixelId, { external_id: visitor.id() })
    }
  }, [])

  React.useEffect(() => {
    if (funnelEnteredRef.current) return
    funnelEnteredRef.current = true
    trackEvent('funnel_viewed')
    trackCustomPixelEvent('ViewQuiz', { id: 'view_quiz' })
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
    trackPixelEvent('ViewContent', {
      id: `view_content_${currentPage.index}`,
      contentName: currentPage.name,
      contentCategory: `step_${currentPage.index + 1}_of_${funnel.funnel.pages.length}`,
    })
  }, [currentPage])

  const trackEvent = (type: Analytics.Event['type'], payload: Analytics.Event['payload'] = {}) => {
    const event = {
      type,
      visitor_id: visitor.id(),
      session_id: session.id(),
      workspace_id: funnel.funnel.workspaceId,
      campaign_id: funnel.campaignId,
      funnel_id: funnel.funnel.id,
      funnel_version: funnel.funnel.version,
      ...(funnel.experimentId && { experiment_id: funnel.experimentId }),
      ...(funnel.experimentVariantId && { experiment_variant_id: funnel.experimentVariantId }),
      version: '1',
      payload,
      timestamp: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(event)], { type: 'application/json' })
    const success = navigator.sendBeacon?.('/api/event', blob)
    if (!success) fetch('/api/event', { method: 'POST', body: blob, keepalive: true })
  }

  const trackPixelEvent = (
    eventName: string,
    properties: { id: string; contentName?: string; contentCategory?: string },
  ) => {
    if (typeof _upstack !== 'undefined') {
      _upstack('track', eventName)
    } else if (typeof fbq !== 'undefined') {
      fbq(
        'track',
        eventName,
        {
          ...(properties.contentName && { content_name: properties.contentName }),
          ...(properties.contentCategory && { content_category: properties.contentCategory }),
        },
        { eventID: `${session.id()}_${properties.id}_std` },
      )
    }
  }

  const trackCustomPixelEvent = (
    eventName: string,
    properties: { id: string; contentName?: string; contentCategory?: string },
  ) => {
    if (typeof _upstack !== 'undefined') {
      _upstack('track', eventName)
    } else if (typeof fbq !== 'undefined') {
      fbq(
        'trackCustom',
        eventName,
        {
          ...(properties.contentName && { content_name: properties.contentName }),
          ...(properties.contentCategory && { content_category: properties.contentCategory }),
        },
        { eventID: `${session.id()}_${properties.id}` },
      )
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
      trackCustomPixelEvent('StartQuiz', { id: 'start_quiz' })
    }

    trackEvent('page_completed', {
      page_id: page.id,
      page_index: page.index,
      page_name: page.name,
      page_duration: currentPageViewedAtRef.current ? Date.now() - currentPageViewedAtRef.current : 0,
    })
    trackCustomPixelEvent('CompleteQuizStep', {
      id: `complete_quiz_step_${page.index}`,
      contentName: page.name,
      contentCategory: `step_${page.index + 1}_of_${funnel.funnel.pages.length}`,
    })

    if (Object.keys(page.values).length > 0) {
      const promise = submitAnswers({
        data: {
          workspaceId: funnel.funnel.workspaceId,
          funnelId: funnel.funnel.id,
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

    trackEvent('funnel_completed')
    trackPixelEvent('Lead', { id: 'complete_quiz' })
    trackCustomPixelEvent('CompleteQuiz', { id: 'complete_quiz' })

    await Promise.allSettled([...pendingAnswerSubmissionsRef.current])
    await completeSubmission({
      data: {
        campaignShortId: funnel.campaignShortId,
        workspaceId: funnel.funnel.workspaceId,
        sessionId,
      },
    })

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
              workspaceId: funnel.funnel.workspaceId,
              campaignId: funnel.campaignId,
              funnelId: funnel.funnel.id,
              funnelVersion: funnel.funnel.version,
              ...(funnel.experimentId && { experimentId: funnel.experimentId }),
              ...(funnel.experimentVariantId && { experimentVariantId: funnel.experimentVariantId }),
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
        funnel={funnel.funnel}
        mode="live"
        onPageChange={handlePageChange}
        onPageComplete={handlePageComplete}
        onComplete={handleComplete}
      />
    </div>
  )
}
