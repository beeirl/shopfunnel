import type { R2Bucket } from '@cloudflare/workers-types'

type Env = {
  Storage: R2Bucket
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const key = url.pathname.slice(1)

    if (!key) {
      return new Response('Not Found', { status: 404 })
    }

    const width = url.searchParams.get('w')
    const height = url.searchParams.get('h')
    const quality = url.searchParams.get('q')
    const hasTransforms = width || height || quality

    // Subrequest from image resizing - serve original from R2
    if (/image-resizing/.test(request.headers.get('via') || '') || !hasTransforms) {
      const object = await env.Storage.get(key)

      if (!object) {
        return new Response('Not Found', { status: 404 })
      }

      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
          ETag: object.httpEtag,
        },
      })
    }

    // Build transformation options
    const imageOptions: RequestInitCfPropertiesImage = {
      fit: 'scale-down',
      ...(width && { width: parseInt(width, 10) }),
      ...(height && { height: parseInt(height, 10) }),
      ...(quality && { quality: parseInt(quality, 10) }),
    }

    // Auto-negotiate format
    const accept = request.headers.get('Accept') || ''
    if (/image\/avif/.test(accept)) {
      imageOptions.format = 'avif'
    } else if (/image\/webp/.test(accept)) {
      imageOptions.format = 'webp'
    }

    // Fetch with transformations
    const response = await fetch(`${url.origin}${url.pathname}`, {
      headers: request.headers,
      cf: { image: imageOptions },
    })

    if (!response.ok) {
      return response
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  },
}
