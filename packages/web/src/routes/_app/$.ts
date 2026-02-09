import { createFileRoute } from '@tanstack/react-router'

const handler = async ({ request }: { request: Request }) => {
  const req = request.clone()
  const url = new URL(req.url)
  const targetUrl = `https://lp.shopfunnel.com${url.pathname}${url.search}`
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  })
  return response
}

export const Route = createFileRoute('/_app/$')({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      PUT: handler,
      PATCH: handler,
      DELETE: handler,
      OPTIONS: handler,
    },
  },
})
