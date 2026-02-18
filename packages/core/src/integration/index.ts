import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { Actor } from '../actor'
import { Database } from '../database'
import { Identifier } from '../identifier'
import { fn } from '../utils/fn'
import type { IntegrationCredentials, IntegrationMetadata } from './index.sql'
import { IntegrationProvider, IntegrationTable } from './index.sql'

export namespace Integration {
  export const fromProvider = fn(z.enum(IntegrationProvider), (provider) =>
    Database.use((tx) =>
      tx
        .select({
          id: IntegrationTable.id,
          provider: IntegrationTable.provider,
          externalId: IntegrationTable.externalId,
          title: IntegrationTable.title,
          metadata: IntegrationTable.metadata,
          createdAt: IntegrationTable.createdAt,
          updatedAt: IntegrationTable.updatedAt,
        })
        .from(IntegrationTable)
        .where(
          and(
            eq(IntegrationTable.workspaceId, Actor.workspaceId()),
            eq(IntegrationTable.provider, provider),
            isNull(IntegrationTable.archivedAt),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
    ),
  )

  export const list = fn(z.void(), () =>
    Database.use((tx) =>
      tx
        .select({
          id: IntegrationTable.id,
          provider: IntegrationTable.provider,
          externalId: IntegrationTable.externalId,
          title: IntegrationTable.title,
          metadata: IntegrationTable.metadata,
          createdAt: IntegrationTable.createdAt,
          updatedAt: IntegrationTable.updatedAt,
        })
        .from(IntegrationTable)
        .where(and(eq(IntegrationTable.workspaceId, Actor.workspaceId()), isNull(IntegrationTable.archivedAt)))
        .orderBy(desc(IntegrationTable.createdAt)),
    ),
  )

  export const connect = fn(
    z.object({
      provider: z.enum(IntegrationProvider),
      externalId: z.string(),
      title: z.string(),
      credentials: z.custom<IntegrationCredentials>(),
      metadata: z.custom<IntegrationMetadata>().optional(),
    }),
    (input) =>
      Database.use((tx) =>
        tx
          .insert(IntegrationTable)
          .values({
            id: Identifier.create('integration'),
            workspaceId: Actor.workspaceId(),
            provider: input.provider,
            externalId: input.externalId,
            title: input.title,
            credentials: input.credentials,
            metadata: input.metadata,
          })
          .onDuplicateKeyUpdate({
            set: {
              title: input.title,
              credentials: input.credentials,
              metadata: input.metadata,
              archivedAt: null,
            },
          }),
      ),
  )

  export const disconnect = fn(
    z.union([
      z.object({ integrationId: z.string() }),
      z.object({ provider: z.enum(IntegrationProvider), externalId: z.string() }),
    ]),
    async (input) => {
      await Database.use((tx) =>
        tx
          .update(IntegrationTable)
          .set({ archivedAt: sql`NOW(3)` })
          .where(
            and(
              ...('integrationId' in input
                ? [eq(IntegrationTable.workspaceId, Actor.workspaceId()), eq(IntegrationTable.id, input.integrationId)]
                : [eq(IntegrationTable.provider, input.provider), eq(IntegrationTable.externalId, input.externalId)]),
              isNull(IntegrationTable.archivedAt),
            ),
          ),
      )
    },
  )
}
