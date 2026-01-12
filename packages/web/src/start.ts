import { createMiddleware, createStart } from '@tanstack/react-start'

const customDomainGuard = createMiddleware().server(async ({ request, next }) => {
  const appStage = process.env.APP_STAGE
  const appDomain = process.env.APP_DOMAIN

  if (appStage !== 'production' || !appDomain) {
    return next()
  }

  const url = new URL(request.url)
  const host = request.headers.get('host') || ''
  const acceptHeader = request.headers.get('accept') || ''
  const isHtmlRequest = acceptHeader.includes('text/html')
  if (!host.endsWith(appDomain) && isHtmlRequest && !url.pathname.startsWith('/q')) {
    return new Response('Not Found', { status: 404 })
  }

  return next()
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [customDomainGuard],
  }
})
