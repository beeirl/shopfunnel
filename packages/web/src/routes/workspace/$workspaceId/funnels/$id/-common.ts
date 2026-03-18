import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Page, Rule, Settings, Theme } from '@shopfunnel/core/funnel/types'
import { Identifier } from '@shopfunnel/core/identifier'
import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getFunnelVariantDraft = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      funnelVariantId: Identifier.schema('funnel_variant').optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      const funnel = await Funnel.getVariantDraft({ id: data.funnelId, variantId: data.funnelVariantId })
      if (!funnel) throw notFound()
      return funnel
    }, data.workspaceId)
  })

export const getFunnelVariantDraftQueryOptions = (input: {
  workspaceId: string
  funnelId: string
  funnelVariantId?: string
}) =>
  queryOptions({
    queryKey: ['funnel-variant-draft', input.workspaceId, input.funnelId, input.funnelVariantId],
    queryFn: () => getFunnelVariantDraft({ data: input }),
  })

export const listVariants = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.listVariants(data.funnelId), data.workspaceId)
  })

export const listVariantsQueryOptions = (input: { workspaceId: string; funnelId: string }) =>
  queryOptions({
    queryKey: ['variants', input.workspaceId, input.funnelId],
    queryFn: () => listVariants({ data: input }),
  })

export const createVariantFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      title: z.string().min(1).max(255),
      fromId: Identifier.schema('funnel_variant'),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () => Funnel.createVariant({ funnelId: data.funnelId, title: data.title, fromId: data.fromId }),
      data.workspaceId,
    )
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
