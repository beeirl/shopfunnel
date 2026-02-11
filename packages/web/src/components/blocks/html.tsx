import { cn } from '@/lib/utils'
import type { InitializeResult } from '@open-iframe-resizer/core'
import { initialize } from '@open-iframe-resizer/core'
import type { HtmlBlock as HtmlBlockType } from '@shopfunnel/core/funnel/types'
import * as React from 'react'

export interface HtmlBlockProps {
  block: HtmlBlockType
  static?: boolean
}

export function HtmlBlock(props: HtmlBlockProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const resizerRef = React.useRef<InitializeResult[]>([])

  const srcDoc = [
    '<!DOCTYPE html>',
    '<html>',
    '  <head>',
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    '    <link rel="preconnect" href="https://fonts.googleapis.com">',
    '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">',
    '    <style>',
    '      *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }',
    '      html { height: auto !important; overflow: hidden; }',
    '      body {',
    '        height: auto !important;',
    '        overflow: hidden;',
    "        font-family: 'Inter', system-ui, -apple-system, sans-serif;",
    '        font-size: 16px;',
    '        line-height: 1.5;',
    '        color: #0a0a0a;',
    '        -webkit-font-smoothing: antialiased;',
    '        -moz-osx-font-smoothing: grayscale;',
    '      }',
    '      img, video { max-width: 100%; height: auto; display: block; }',
    '      a { color: inherit; }',
    '    </style>',
    '  </head>',
    `  <body>${props.block.properties.html}</body>`,
    '</html>',
  ].join('\n')

  React.useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    let cancelled = false

    const init = async () => {
      resizerRef.current.forEach((r) => r.unsubscribe())
      resizerRef.current = []

      await new Promise<void>((resolve) => {
        iframe.addEventListener('load', () => resolve(), { once: true })
      })

      if (cancelled) return

      const doc = iframe.contentDocument
      if (doc?.body) {
        doc.body.style.margin = '0px'
        doc.body.style.padding = '0px'
      }

      if (doc?.documentElement) {
        const height = doc.documentElement.getBoundingClientRect().height
        iframe.style.height = `${height}px`
      }

      const resizer = await initialize({}, iframe)
      if (cancelled) {
        resizer.forEach((r) => r.unsubscribe())
      } else {
        resizerRef.current = resizer
      }
    }

    init()

    return () => {
      cancelled = true
      resizerRef.current.forEach((r) => r.unsubscribe())
      resizerRef.current = []
    }
  }, [srcDoc])

  return (
    <div className={cn('overflow-hidden group-not-data-first/block:mt-6', props.static && 'pointer-events-none')}>
      <iframe className="block w-full border-none" ref={iframeRef} sandbox="allow-same-origin" srcDoc={srcDoc} />
    </div>
  )
}
