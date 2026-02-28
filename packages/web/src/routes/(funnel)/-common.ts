import { Actor } from '@shopfunnel/core/actor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Integration } from '@shopfunnel/core/integration/index'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const listIntegrations = createServerFn()
  .inputValidator(z.object({ workspaceId: Identifier.schema('workspace') }))
  .handler(async ({ data }) => {
    return Actor.provide('system', { workspaceId: data.workspaceId }, () => Integration.list())
  })
