import type { MessageBatch } from '@cloudflare/workers-types'
import type { Analytics } from '@shopfunnel/core/analytics/index'
import { Resource } from '@shopfunnel/resource'

export default {
  async queue(batch: MessageBatch<Analytics.QuizEvent>) {
    const events = batch.messages.map((m) => m.body)
    if (events.length === 0) return

    const body = events.map((e) => JSON.stringify(e)).join('\n')

    await fetch('https://api.us-east.aws.tinybird.co/v0/events?name=quiz_events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Resource.TINYBIRD_TOKEN.value}`,
        'Content-Type': 'application/x-ndjson',
      },
      body,
    })
  },
}
