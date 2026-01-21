import { register } from '@shopify/web-pixels-extension'

function toCents(amount: string | number | undefined) {
  if (!amount) return 0
  return Math.round(Number(amount) * 100)
}

register(({ analytics, browser, settings, init }) => {
  const apiUrl = settings.apiUrl
  if (!apiUrl) return

  analytics.subscribe('page_viewed', async () => {
    const url = new URL(init.context.document.location.href)
    const sessionParam = url.searchParams.get('_sfs')
    if (!sessionParam) return

    const session = (() => {
      try {
        return JSON.parse(atob(sessionParam))
      } catch {}
    })()
    const existingSession = await (async () => {
      const session = await browser.cookie.get('_sfs')
      if (!session) return
      try {
        return JSON.parse(atob(session))
      } catch {}
    })()
    if (existingSession?.id === session?.id) return

    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()
    await browser.cookie.set(`_sfs=${sessionParam}; expires=${expires}; path=/`)

    fetch(`${apiUrl}/api/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'external_page_viewed',
        visitor_id: session.visitorId,
        session_id: session.id,
        workspace_id: session.workspaceId,
        funnel_id: session.funnelId,
        funnel_version: session.funnelVersion,
        version: '1',
        timestamp: new Date().toISOString(),
        payload: {
          integration_id: session.integrationId,
          integration_provider: session.integrationProvider,
        },
      }),
      keepalive: true,
    })
  })

  analytics.subscribe('checkout_completed', async (event) => {
    const session = await (async () => {
      const session = await browser.cookie.get('_sfs')
      if (!session) return
      try {
        return JSON.parse(atob(session))
      } catch {}
    })()
    if (!session) return

    fetch(`${apiUrl}/api/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'external_checkout_completed',
        visitor_id: session.visitorId,
        session_id: session.id,
        workspace_id: session.workspaceId,
        funnel_id: session.funnelId,
        funnel_version: session.funnelVersion,
        version: '1',
        timestamp: new Date().toISOString(),
        payload: {
          integration_id: session.integrationId,
          integration_provider: session.integrationProvider,
          external_id: event.data.checkout.order?.id || '',
          amount: toCents(event.data.checkout.totalPrice?.amount),
          currency: event.data.checkout.currencyCode || 'USD',
        },
      }),
      keepalive: true,
    })
  })
})
