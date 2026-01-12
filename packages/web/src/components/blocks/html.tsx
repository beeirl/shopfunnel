import { cn } from '@/lib/utils'
import type { HtmlBlock as HtmlBlockType } from '@shopfunnel/core/funnel/types'
import * as React from 'react'

export interface HtmlBlockProps {
  block: HtmlBlockType
  static?: boolean
}

export function HtmlBlock(props: HtmlBlockProps) {
  const [height, setHeight] = React.useState(100)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const updateHeight = () => {
    const body = iframeRef.current?.contentDocument?.body
    if (body) setHeight(body.scrollHeight)
  }

  React.useEffect(() => {
    updateHeight()
  }, [props.block.properties.html])

  return (
    <div className={cn('overflow-hidden group-not-data-first/block:mt-6', props.static && 'pointer-events-none')}>
      <iframe
        ref={iframeRef}
        className="w-full"
        sandbox="allow-same-origin"
        onLoad={updateHeight}
        style={{ height }}
        srcDoc={`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
              html, body {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                font-size: 16px;
                line-height: 1.5;
                color: #0a0a0a;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              img, video { max-width: 100%; height: auto; display: block; }
              a { color: inherit; }
            </style>
          </head>
          <body>${props.block.properties.html}</body>
          </html>
        `}
      />
    </div>
  )
}
