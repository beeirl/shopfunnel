import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Page, Rule, Settings, Theme } from '@shopfunnel/core/funnel/types'
import { Identifier } from '@shopfunnel/core/identifier'
import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getFunnel = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant').optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      const funnel = await Funnel.getDraft({ id: data.funnelId, variantId: data.funnelVariantId })
      if (!funnel) throw notFound()
      return funnel
    }, data.workspaceId)
  })

export const getFunnelQueryOptions = (workspaceId: string, funnelId: string, funnelVariantId?: string) =>
  queryOptions({
    queryKey: ['funnel', workspaceId, funnelId, funnelVariantId],
    queryFn: () => getFunnel({ data: { workspaceId, funnelId, funnelVariantId } }),
  })

export const updateFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant'),
      pages: z.array(Page).optional(),
      rules: z.array(Rule).optional(),
      theme: Theme.optional(),
      title: z.string().min(1).max(255).optional(),
      settings: Settings.optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      if (data.title) {
        await Funnel.updateTitle({ id: data.funnelId, title: data.title })
      }
      if (data.settings) {
        await Funnel.updateSettings({ id: data.funnelId, settings: data.settings })
      }
      if (data.pages || data.rules || data.theme) {
        await Funnel.update({
          funnelVariantId: data.funnelVariantId,
          pages: data.pages,
          rules: data.rules,
          theme: data.theme,
        })
      }
    }, data.workspaceId)
  })
