import { Actor } from '@shopfunnel/core/actor'
import { Database } from '@shopfunnel/core/database/index'
import type { KlaviyoCredentials } from '@shopfunnel/core/integration/index.sql'
import { IntegrationTable } from '@shopfunnel/core/integration/index.sql'
import { Klaviyo } from '@shopfunnel/core/integration/klaviyo'
import { LeadTable } from '@shopfunnel/core/lead/index.sql'
import { and, eq, gte, isNull } from 'drizzle-orm'

export default {
  async scheduled() {
    const since = new Date(Date.now() - 6 * 60 * 1000)

    const integrations = await Database.use((tx) =>
      tx
        .select({
          id: IntegrationTable.id,
          workspaceId: IntegrationTable.workspaceId,
          credentials: IntegrationTable.credentials,
        })
        .from(IntegrationTable)
        .where(and(eq(IntegrationTable.provider, 'klaviyo'), isNull(IntegrationTable.archivedAt))),
    )

    for (const integration of integrations) {
      try {
        await Actor.provide('system', { workspaceId: integration.workspaceId }, async () => {
          const leads = await Database.use((tx) =>
            tx
              .select({ email: LeadTable.email, phone: LeadTable.phone })
              .from(LeadTable)
              .where(and(eq(LeadTable.workspaceId, integration.workspaceId), gte(LeadTable.updatedAt, since))),
          )

          if (leads.length === 0) return

          const credentials = integration.credentials as KlaviyoCredentials
          const accessToken = await Klaviyo.getToken({
            integrationId: integration.id,
            credentials,
          })

          await Klaviyo.syncLeads({
            accessToken,
            leads,
          })
        })
      } catch (error) {
        console.error(`Failed to sync Klaviyo leads for workspace ${integration.workspaceId}:`, error)
      }
    }
  },
}
