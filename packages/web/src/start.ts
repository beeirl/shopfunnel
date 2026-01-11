import { createMiddleware, createStart } from '@tanstack/react-start'

const customDomainGuard = createMiddleware().server(async ({ request, next }) => {
  const stage = process.env.SST_STAGE
  const domain = process.env.DOMAIN

  if (stage !== 'production' || !domain) {
    return next()
  }

  const url = new URL(request.url)
  const host = request.headers.get('host') || ''
  const acceptHeader = request.headers.get('accept') || ''
  const isHtmlRequest = acceptHeader.includes('text/html')
  if (!host.endsWith(domain) && isHtmlRequest && !url.pathname.startsWith('/q')) {
    return new Response('Not Found', { status: 404 })
  }

  return next()
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [customDomainGuard],
  }
})
