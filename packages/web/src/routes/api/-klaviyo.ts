import { getLastSeenWorkspaceId } from '@/routes/-common'
import { Actor } from '@shopfunnel/core/actor'
import { Integration } from '@shopfunnel/core/integration/index'
import type { KlaviyoCredentials } from '@shopfunnel/core/integration/index.sql'
import { Resource } from '@shopfunnel/resource'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

const KLAVIYO_API_REVISION = '2025-01-15'

function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export const KlaviyoRoute = new Hono()
  .get('/authorize', async (c) => {
    // Check if user is logged in
    let workspaceId: string | undefined
    try {
      workspaceId = await getLastSeenWorkspaceId()
    } catch {}
    if (!workspaceId) {
      const callback = encodeURIComponent('/api/klaviyo/authorize')
      return c.redirect(`/auth/authorize?callback=${callback}`)
    }

    const cookieOpts = {
      httpOnly: true,
      maxAge: 600,
      path: '/',
      sameSite: 'lax' as const,
      secure: true,
    }

    // Store workspace ID in cookie
    setCookie(c, 'klaviyo.workspace_id', workspaceId, cookieOpts)

    // PKCE: generate code_verifier and store in cookie
    const codeVerifier = generateCodeVerifier()
    setCookie(c, 'klaviyo.code_verifier', codeVerifier, cookieOpts)

    // State for CSRF protection
    const state = crypto.randomUUID()
    setCookie(c, 'klaviyo.state', state, cookieOpts)

    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const origin = new URL(c.req.url).origin

    const authorizeUrl = new URL('https://www.klaviyo.com/oauth/authorize')
    authorizeUrl.search = new URLSearchParams({
      response_type: 'code',
      client_id: Resource.KLAVIYO_CLIENT_ID.value,
      redirect_uri: `${origin}/api/klaviyo/callback`,
      scope: 'accounts:read profiles:write',
      state,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    }).toString()

    return c.redirect(authorizeUrl.toString())
  })
  .get('/callback', async (c) => {
    const url = new URL(c.req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    const workspaceId = getCookie(c, 'klaviyo.workspace_id')

    if (error) {
      const description = url.searchParams.get('error_description') || 'Authorization denied'
      const redirectPath = workspaceId ? `/workspace/${workspaceId}/integrations` : '/workspace'
      return c.redirect(`${redirectPath}?klaviyo_error=${encodeURIComponent(description)}`)
    }

    if (!code || !state) {
      return c.json({ error: 'Missing authorization code or state' }, 400)
    }

    // Validate state
    const storedState = getCookie(c, 'klaviyo.state')
    if (state !== storedState) {
      return c.json({ error: 'Invalid state' }, 400)
    }

    // Get PKCE verifier and workspace ID from cookies
    const codeVerifier = getCookie(c, 'klaviyo.code_verifier')

    if (!codeVerifier || !workspaceId) {
      return c.json({ error: 'Missing session data. Please try again.' }, 400)
    }

    const origin = new URL(c.req.url).origin

    // Exchange authorization code for tokens
    const clientId = Resource.KLAVIYO_CLIENT_ID.value
    const clientSecret = Resource.KLAVIYO_CLIENT_SECRET.value
    const basicAuth = btoa(`${clientId}:${clientSecret}`)

    const tokenResponse = await fetch('https://a.klaviyo.com/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: `${origin}/api/klaviyo/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text()
      console.error('Klaviyo token exchange failed:', text)
      return c.json({ error: 'Failed to exchange code for token' }, 500)
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string
      refresh_token: string
      expires_in: number
    }

    const credentials: KlaviyoCredentials = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    }

    // Fetch Klaviyo account info for externalId and title
    const accountResponse = await fetch('https://a.klaviyo.com/api/accounts', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        revision: KLAVIYO_API_REVISION,
      },
    })

    let externalId = workspaceId
    let title = 'Unknown'

    if (accountResponse.ok) {
      const accountData = (await accountResponse.json()) as {
        data: Array<{
          id: string
          attributes: { contact_information: { organization_name: string } }
        }>
      }
      if (accountData.data[0]) {
        externalId = accountData.data[0].id
        title = accountData.data[0].attributes.contact_information.organization_name || 'Unknown'
      }
    }

    // Disconnect existing Klaviyo integration (one per workspace)
    await Actor.provide('system', { workspaceId }, () => Integration.disconnect({ provider: 'klaviyo' }))

    // Store integration
    await Actor.provide('system', { workspaceId }, () =>
      Integration.connect({
        provider: 'klaviyo',
        externalId,
        title,
        credentials,
      }),
    )

    // Clean up cookies
    deleteCookie(c, 'klaviyo.workspace_id')
    deleteCookie(c, 'klaviyo.code_verifier')
    deleteCookie(c, 'klaviyo.state')

    return c.redirect(`/workspace/${workspaceId}/integrations?klaviyo=connected`)
  })
