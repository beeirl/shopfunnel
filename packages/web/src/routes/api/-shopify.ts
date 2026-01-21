import { getLastSeenWorkspaceId } from '@/routes/-common'
import { zValidator } from '@hono/zod-validator'
import { Actor } from '@shopfunnel/core/actor'
import { Integration } from '@shopfunnel/core/integration/index'
import { Resource } from '@shopfunnel/resource'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { z } from 'zod'

async function validateHmac(body: string, hmac: string, encoding: 'hex' | 'base64' = 'hex') {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(Resource.SHOPIFY_CLIENT_SECRET.value),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const generatedHmac =
    encoding === 'hex'
      ? Array.from(new Uint8Array(signature))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      : btoa(String.fromCharCode(...new Uint8Array(signature)))
  return hmac === generatedHmac
}

export const ShopifyRoute = new Hono()
  .get(
    '/authorize',
    zValidator(
      'query',
      z.object({
        hmac: z.string().optional(),
        shop: z.string(),
      }),
    ),
    async (c) => {
      const query = c.req.valid('query')

      // Verify HMAC
      if (query.hmac) {
        const hmacValid = await validateHmac(
          (() => {
            const url = new URL(c.req.url)
            const params = new URLSearchParams(url.search)
            params.delete('hmac')
            params.sort()
            return params.toString()
          })(),
          query.hmac,
        )
        if (!hmacValid) return c.json({ error: 'Invalid HMAC signature' }, 400)
      }

      // Check if user is logged in by trying to get their workspace
      let workspaceId: string | undefined
      try {
        workspaceId = await getLastSeenWorkspaceId()
      } catch {}
      if (!workspaceId) {
        const callback = encodeURIComponent(`/api/shopify/authorize?shop=${query.shop}`)
        return c.redirect(`/auth/authorize?callback=${callback}`)
      }

      // User is logged in - store workspace ID and state in cookies
      setCookie(c, 'shopify.workspace_id', workspaceId, {
        httpOnly: true,
        maxAge: 600,
        path: '/',
        sameSite: 'lax',
        secure: true,
      })

      const state = crypto.randomUUID()
      setCookie(c, 'shopify.state', state, {
        httpOnly: true,
        maxAge: 600,
        path: '/',
        sameSite: 'lax',
        secure: true,
      })

      // Redirect to Shopify OAuth
      const redirectUrl = new URL(`https://${query.shop}/admin/oauth/authorize`)
      redirectUrl.search = new URLSearchParams({
        client_id: Resource.SHOPIFY_CLIENT_ID.value,
        scope: 'write_pixels,read_customer_events',
        redirect_uri: `${new URL(c.req.url).origin}/api/shopify/callback`,
        state,
      }).toString()

      return c.redirect(redirectUrl)
    },
  )
  .get(
    '/callback',
    zValidator(
      'query',
      z.object({
        shop: z.string(),
        code: z.string(),
        state: z.string(),
        hmac: z.string(),
      }),
    ),
    async (c) => {
      const query = c.req.valid('query')

      // Validate state
      const state = getCookie(c, 'shopify.state')
      if (query.state !== state) return c.json({ error: 'Invalid state' }, 400)

      // Validate HMAC
      const hmacValid = await validateHmac(
        (() => {
          const url = new URL(c.req.url)
          const params = new URLSearchParams(url.search)
          params.delete('hmac')
          params.sort()
          return params.toString()
        })(),
        query.hmac,
      )
      if (!hmacValid) return c.json({ error: 'Invalid HMAC signature' }, 400)

      // Get workspace ID from cookie
      const workspaceId = getCookie(c, 'shopify.workspace_id')
      if (!workspaceId) return c.json({ error: 'No workspace found. Please try again.' }, 400)

      // Exchange code for access token
      const tokenResponse = await fetch(`https://${query.shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: Resource.SHOPIFY_CLIENT_ID.value,
          client_secret: Resource.SHOPIFY_CLIENT_SECRET.value,
          code: query.code,
        }),
      })
      if (!tokenResponse.ok) return c.json({ error: 'Failed to exchange code for token' }, 500)
      const tokenResponseJson = (await tokenResponse.json()) as any

      const shopResponse = await fetch(`https://${query.shop}/admin/api/2024-10/shop.json`, {
        headers: { 'X-Shopify-Access-Token': tokenResponseJson.access_token },
      })
      if (!shopResponse.ok) return c.json({ error: 'Failed to fetch shop info' }, 500)
      const shopResponseJson = (await shopResponse.json()) as any

      await Actor.provide('system', { workspaceId }, () =>
        Integration.connect({
          provider: 'shopify',
          externalId: String(shopResponseJson.shop.id),
          title: shopResponseJson.shop.name,
          credentials: { accessToken: tokenResponseJson.access_token },
          metadata: { shopDomain: query.shop, shopName: shopResponseJson.shop.name },
        }),
      )

      // Create/update web pixel with settings
      const pixelResponse = await fetch(`https://${query.shop}/admin/api/2024-10/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': tokenResponseJson.access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation webPixelCreate($webPixel: WebPixelInput!) {
            webPixelCreate(webPixel: $webPixel) {
              webPixel { id }
              userErrors { field message }
            }
          }`,
          variables: {
            webPixel: {
              settings: JSON.stringify({
                apiUrl: `https://${process.env.APP_DOMAIN}`,
                shopifyShopId: String(shopResponseJson.shop.id),
              }),
            },
          },
        }),
      })
      if (!pixelResponse.ok) {
        console.error('Failed to create web pixel:', await pixelResponse.text())
      }

      deleteCookie(c, 'shopify.workspace_id')
      deleteCookie(c, 'shopify.state')

      return c.redirect(`/workspace/${workspaceId}?shopify=connected`)
    },
  )
  .post('/webhooks', async (c) => {
    const body = await c.req.text()

    const hmac = c.req.header('X-Shopify-Hmac-Sha256')
    if (!hmac) return c.json({ error: 'Missing HMAC header' }, 400)
    const hmacValid = await validateHmac(body, hmac, 'base64')
    if (!hmacValid) return c.json({ error: 'Invalid HMAC signature' }, 400)

    const topic = c.req.header('X-Shopify-Topic')
    if (topic === 'shop/redact') {
      const payload = JSON.parse(body)
      await Integration.disconnect({
        provider: 'shopify',
        externalId: String(payload.shop_id),
      })
    }

    return c.json('ok', 200)
  })
