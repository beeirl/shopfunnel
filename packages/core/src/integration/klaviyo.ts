import { Resource } from '@shopfunnel/resource'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { Database } from '../database'
import { fn } from '../utils/fn'
import type { KlaviyoCredentials } from './index.sql'
import { IntegrationTable } from './index.sql'

const KLAVIYO_API_REVISION = '2025-01-15'
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

export namespace Klaviyo {
  export const getToken = fn(
    z.object({
      integrationId: z.string(),
      credentials: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresAt: z.number(),
      }),
    }),
    async (input): Promise<string> => {
      const now = Date.now()
      if (input.credentials.expiresAt - TOKEN_REFRESH_BUFFER_MS > now) {
        return input.credentials.accessToken
      }

      const basicAuth = btoa(`${Resource.KLAVIYO_CLIENT_ID.value}:${Resource.KLAVIYO_CLIENT_SECRET.value}`)
      const response = await fetch('https://a.klaviyo.com/oauth/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: input.credentials.refreshToken,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Klaviyo token refresh failed (${response.status}): ${text}`)
      }

      const tokens = (await response.json()) as {
        access_token: string
        refresh_token: string
        expires_in: number
      }

      const updatedCredentials: KlaviyoCredentials = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      }

      // Persist refreshed tokens
      await Database.use((tx) =>
        tx
          .update(IntegrationTable)
          .set({
            credentials: sql`${JSON.stringify(updatedCredentials)}`,
          })
          .where(eq(IntegrationTable.id, input.integrationId)),
      )

      return tokens.access_token
    },
  )

  export const syncLeads = fn(
    z.object({
      accessToken: z.string(),
      leads: z.array(
        z.object({
          email: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
        }),
      ),
    }),
    async (input) => {
      if (input.leads.length === 0) return

      const profiles = input.leads.map((lead) => ({
        type: 'profile' as const,
        attributes: {
          ...(lead.email && { email: lead.email }),
          ...(lead.phone && { phone_number: lead.phone }),
        },
      }))

      const body = {
        data: {
          type: 'profile-bulk-import-job',
          attributes: {
            profiles: {
              data: profiles,
            },
          },
        },
      }

      const response = await fetch('https://a.klaviyo.com/api/profile-bulk-import-jobs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          'Content-Type': 'application/json',
          revision: KLAVIYO_API_REVISION,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const text = await response.text()
        console.error(`Klaviyo API error (${response.status}): ${text}`)
      }
    },
  )
}
