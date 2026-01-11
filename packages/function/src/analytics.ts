import type { MessageBatch } from '@cloudflare/workers-types'
import type { Analytics } from '@shopfunnel/core/analytics/index'
import { Resource } from '@shopfunnel/resource'

export default {
  async queue(batch: MessageBatch<Analytics.Event>) {
    const events = batch.messages.map((m) => {
      const event = m.body
      return {
        timestamp: event.timestamp,
        session_id: event.session_id,
        visitor_id: event.visitor_id,
        type: event.type,
        version: event.version,
        workspace_id: event.workspace_id,
        funnel_id: event.funnel_id,
        funnel_version: event.funnel_version,
        payload: JSON.stringify(event.payload),
      }
    })
    if (events.length === 0) return

    const body = events.map((e) => JSON.stringify(e)).join('\n')

    await fetch('https://api.us-east.aws.tinybird.co/v0/events?name=events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Resource.TINYBIRD_TOKEN.value}`,
        'Content-Type': 'application/x-ndjson',
      },
      body,
    })
  },
}
