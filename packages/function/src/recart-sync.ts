import { Actor } from '@shopfunnel/core/actor'
import { Database } from '@shopfunnel/core/database/index'
import type { RecartCredentials } from '@shopfunnel/core/integration/index.sql'
import { IntegrationTable } from '@shopfunnel/core/integration/index.sql'
import { Recart } from '@shopfunnel/core/integration/recart'
import { LeadTable } from '@shopfunnel/core/lead/index.sql'
import { and, eq, gte, isNull, lt } from 'drizzle-orm'

export default {
  async scheduled() {
    const integrations = await Database.use((tx) =>
      tx
        .select({
          workspaceId: IntegrationTable.workspaceId,
          credentials: IntegrationTable.credentials,
          metadata: IntegrationTable.metadata,
        })
        .from(IntegrationTable)
        .where(and(eq(IntegrationTable.provider, 'recart'), isNull(IntegrationTable.archivedAt))),
    )

    const windowEnd = new Date()
    windowEnd.setSeconds(0, 0)
    const windowStart = new Date(windowEnd.getTime() - 60_000)

    for (const integration of integrations) {
      try {
        await Actor.provide('system', { workspaceId: integration.workspaceId }, async () => {
          const leads = await Database.use((tx) =>
            tx
              .select({ phone: LeadTable.phone })
              .from(LeadTable)
              .where(
                and(
                  eq(LeadTable.workspaceId, integration.workspaceId),
                  gte(LeadTable.updatedAt, windowStart),
                  lt(LeadTable.updatedAt, windowEnd),
                ),
              ),
          )

          await Recart.syncLeads({
            apiKey: (integration.credentials as RecartCredentials).apiKey,
            phoneNumbers: [...new Set(leads.flatMap((lead) => (lead.phone ? [lead.phone] : [])))],
          })
        })
      } catch (error) {
        console.error(`Failed to sync Recart leads for workspace ${integration.workspaceId}:`, error)
      }
    }
  },
}
