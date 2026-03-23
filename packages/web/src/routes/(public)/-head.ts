import type { AnyRouteMatch } from '@tanstack/react-router'
import { parse as parseHtml } from 'node-html-parser'

export function head(input: {
  domainSettings?: {
    faviconUrl?: string | null
    faviconType?: string | null
    customCode?: string | null
    metaTitle?: string | null
    metaDescription?: string | null
    metaImageUrl?: string | null
  }
  integrations?: Array<{ provider: string; metadata: unknown }>
}) {
  const meta: AnyRouteMatch['meta'] = []
  const scripts: AnyRouteMatch['headScripts'] = []
  const links: AnyRouteMatch['links'] = []
  const styles: AnyRouteMatch['styles'] = []

  const settings = input.domainSettings

  const metaPixelIntegration = input.integrations?.find((i) => i.provider === 'meta_pixel')
  if (metaPixelIntegration) {
    const pixelId = (metaPixelIntegration.metadata as { pixelId: string }).pixelId
    scripts.push({
      children: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`,
    })
  }

  if (settings?.faviconUrl) {
    links.push({
      rel: 'icon',
      href: settings.faviconUrl,
      ...(settings.faviconType && { type: settings.faviconType }),
    })
  }

  if (settings?.metaTitle) {
    meta.push({ title: settings.metaTitle })
  }
  if (settings?.metaDescription) {
    meta.push({ name: 'description', content: settings.metaDescription })
  }
  if (settings?.metaImageUrl) {
    meta.push({ property: 'og:image', content: settings.metaImageUrl })
  }

  if (settings?.customCode) {
    const html = parseHtml(settings.customCode)
    const elements = html.querySelectorAll('script, link, meta, style')

    for (const el of elements) {
      const attrs = el.attributes
      switch (el.tagName?.toLowerCase()) {
        case 'script':
          scripts.push({ ...attrs, ...(el.textContent && { children: el.textContent }) })
          break
        case 'link':
          links.push(attrs)
          break
        case 'meta':
          meta.push(attrs)
          break
        case 'style':
          styles.push({ ...attrs, ...(el.textContent && { children: el.textContent }) })
          break
      }
    }
  }

  return { meta, scripts, links, styles }
}
