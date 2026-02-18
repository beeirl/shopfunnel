/// <reference types="vite/client" />

import { SnackbarManager } from '@/components/ui/snackbar'
import esbuildPolyfill from '@/esbuild-polyfill?raw'
import { snackbar } from '@/lib/snackbar'
import styles from '@/styles/index.css?url'
import { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: ({ matches }) => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Shopfunnel',
      },
    ],
    links: [
      { rel: 'stylesheet', href: styles },
      ...(!matches.some((m) => (m.routeId as string) === '/f/$id')
        ? [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
        : []),
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <script dangerouslySetInnerHTML={{ __html: esbuildPolyfill }} />
        <HeadContent />
      </head>
      <body className="bg-background antialiased">
        {children}
        <SnackbarManager manager={snackbar} />
        <Scripts />
      </body>
    </html>
  )
}
