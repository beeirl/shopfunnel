import { createFileRoute } from '@tanstack/react-router'
import { Hono } from 'hono'
import { EventRoute } from './-event'
import { ShopifyRoute } from './-shopify'

const app = new Hono().basePath('/api').route('/event', EventRoute).route('/shopify', ShopifyRoute)

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: ({ request }) => app.fetch(request),
      POST: ({ request }) => app.fetch(request),
      PUT: ({ request }) => app.fetch(request),
      PATCH: ({ request }) => app.fetch(request),
      DELETE: ({ request }) => app.fetch(request),
      OPTIONS: ({ request }) => app.fetch(request),
    },
  },
})
