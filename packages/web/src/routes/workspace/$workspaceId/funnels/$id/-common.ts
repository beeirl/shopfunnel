import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import type { Page, Rule, Settings, Theme } from '@shopfunnel/core/funnel/types'
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
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      const funnel = await Funnel.getCurrentVersion(data.funnelId)
      if (!funnel) throw notFound()
      return funnel
    }, data.workspaceId)
  })

export const getFunnelQueryOptions = (workspaceId: string, funnelId: string) =>
  queryOptions({
    queryKey: ['funnel', workspaceId, funnelId],
    queryFn: () => getFunnel({ data: { workspaceId, funnelId } }),
  })

export const updateFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      pages: z.custom<Page[]>().optional(),
      rules: z.custom<Rule[]>().optional(),
      theme: z.custom<Theme>().optional(),
      title: z.string().min(1).max(255).optional(),
      settings: z.custom<Settings>().optional(),
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
          id: data.funnelId,
          pages: data.pages,
          rules: data.rules,
          theme: data.theme,
        })
      }
    }, data.workspaceId)
  })
