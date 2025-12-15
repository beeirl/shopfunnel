import { withActor } from '@/context/auth.withActor'
import { InspectorPanel } from '@/routes/workspace/$workspaceId/funnels/$id/edit/-components/inspector-panel'
import { LayersPanel } from '@/routes/workspace/$workspaceId/funnels/$id/edit/-components/layers-panel'
import { Navbar, type NavbarTab } from '@/routes/workspace/$workspaceId/funnels/$id/edit/-components/navbar'
import { Preview } from '@/routes/workspace/$workspaceId/funnels/$id/edit/-components/preview'
import { ThemePanel } from '@/routes/workspace/$workspaceId/funnels/$id/edit/-components/theme-panel'
import { Funnel } from '@shopfunnel/core/funnel/index'
import type { Block, Page, Rule, Variables } from '@shopfunnel/core/funnel/schema'
import { Identifier } from '@shopfunnel/core/identifier'
import { useDebouncer } from '@tanstack/react-pacer'
import { mutationOptions, queryOptions, useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { ulid } from 'ulid'
import { z } from 'zod'

const getFunnel = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      const funnel = await Funnel.fromId(data.funnelId)
      if (!funnel) throw notFound()
      return funnel
    }, data.workspaceId)
  })

const getFunnelQueryOptions = (workspaceId: string, funnelId: string) =>
  queryOptions({
    queryKey: ['funnel', workspaceId, funnelId],
    queryFn: () => getFunnel({ data: { workspaceId, funnelId } }),
  })

const updateFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      pages: z.custom<Page[]>().optional(),
      rules: z.custom<Rule[]>().optional(),
      variables: z.custom<Variables>().optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Funnel.update({
          id: data.funnelId,
          pages: data.pages,
          rules: data.rules,
          variables: data.variables,
        }),
      data.workspaceId,
    )
  })

const updateFunnelMutationOptions = (workspaceId: string, funnelId: string) =>
  mutationOptions({
    mutationFn: (data: { pages?: Page[]; rules?: Rule[]; variables?: Variables }) =>
      updateFunnel({ data: { workspaceId, funnelId, ...data } }),
  })

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/edit/')({
  component: RouteComponent,
  ssr: false,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getFunnelQueryOptions(params.workspaceId, params.id))
  },
})

function RouteComponent() {
  const params = Route.useParams()

  const funnelQuery = useSuspenseQuery(getFunnelQueryOptions(params.workspaceId, params.id))

  const [funnel, setFunnel] = React.useState<Funnel.Info>(() => funnelQuery.data)
  const [selectedPageId, setSelectedPageId] = React.useState(() => funnel.pages[0]?.id ?? null)
  const [selectedBlockId, setSelectedBlockId] = React.useState(() => funnel.pages[0]?.blocks[0]?.id ?? null)
  const [activeTab, setActiveTab] = React.useState<NavbarTab>('explorer')

  const updateFunnelMutation = useMutation(updateFunnelMutationOptions(params.workspaceId, params.id))

  const saveDebouncer = useDebouncer(
    (data: { pages: Page[]; rules: Rule[]; variables: Variables }) => {
      updateFunnelMutation.mutate(data)
    },
    { wait: 1000 },
  )

  const selectedPage = funnel.pages.find((page) => page.id === selectedPageId) ?? null
  const selectedBlock = selectedPage?.blocks.find((b) => b.id === selectedBlockId) ?? null

  const handlePageSelect = (pageId: string) => {
    setSelectedPageId(pageId)
    const page = funnel.pages.find((p) => p.id === pageId)
    setSelectedBlockId(page?.blocks[0]?.id ?? null)
  }

  const handlePagesReorder = (reorderedPages: Page[]) => {
    const updated = { ...funnel, pages: reorderedPages }
    setFunnel(updated)
    saveDebouncer.maybeExecute({ pages: updated.pages, rules: updated.rules, variables: updated.variables })
  }

  const handlePageAdd = () => {
    const newPage: Page = {
      id: ulid(),
      blocks: [],
    }
    const updated = { ...funnel, pages: [...funnel.pages, newPage] }
    setFunnel(updated)
    setSelectedPageId(newPage.id)
    setSelectedBlockId(null)
    saveDebouncer.maybeExecute({ pages: updated.pages, rules: updated.rules, variables: updated.variables })
  }

  const handlePageDelete = (pageId: string) => {
    setFunnel((prev) => {
      const pageIndex = prev.pages.findIndex((page) => page.id === pageId)
      const updatedPages = prev.pages.filter((page) => page.id !== pageId)
      const newIndex = Math.max(0, pageIndex - 1)
      const newSelectedPage = updatedPages[newIndex] ?? null
      setSelectedPageId(newSelectedPage?.id ?? null)
      setSelectedBlockId(newSelectedPage?.blocks[0]?.id ?? null)
      const updated = { ...prev, pages: updatedPages }
      saveDebouncer.maybeExecute({ pages: updated.pages, rules: updated.rules, variables: updated.variables })
      return updated
    })
  }

  const handleBlockSelect = (blockId: string | null) => {
    setSelectedBlockId(blockId)
  }

  const handleBlocksReorder = (reorderedBlocks: Block[]) => {
    if (!selectedPageId) return
    const updated = {
      ...funnel,
      pages: funnel.pages.map((page) => (page.id === selectedPageId ? { ...page, blocks: reorderedBlocks } : page)),
    }
    setFunnel(updated)
    saveDebouncer.maybeExecute({ pages: updated.pages, rules: updated.rules, variables: updated.variables })
  }

  const handleBlockAdd = (block: Block) => {
    if (!selectedPageId) return
    const updated = {
      ...funnel,
      pages: funnel.pages.map((page) =>
        page.id === selectedPageId ? { ...page, blocks: [...page.blocks, block] } : page,
      ),
    }
    setFunnel(updated)
    setSelectedBlockId(block.id)
    saveDebouncer.maybeExecute({ pages: updated.pages, rules: updated.rules, variables: updated.variables })
  }

  const handleBlockUpdate = (blockId: string, updates: Partial<Block>) => {
    const updated = {
      ...funnel,
      pages: funnel.pages.map((page) => ({
        ...page,
        blocks: page.blocks.map((b) => (b.id === blockId ? ({ ...b, ...updates } as Block) : b)),
      })),
    }
    setFunnel(updated)
    saveDebouncer.maybeExecute({ pages: updated.pages, rules: updated.rules, variables: updated.variables })
  }

  return (
    <div className="flex h-screen w-screen">
      <div className="relative flex h-full min-h-32 w-full flex-col">
        <div className="relative z-10 flex h-full w-full flex-1 flex-col bg-muted">
          <div className="flex h-12 w-full shrink-0 items-center gap-2 border-b bg-background px-4">
            <div className="flex w-56 items-center gap-2"></div>
            <div className="ml-auto flex w-56 items-center justify-end gap-2"></div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
            {activeTab === 'explorer' ? (
              <LayersPanel
                pages={funnel.pages}
                selectedPageId={selectedPageId}
                onPageSelect={handlePageSelect}
                onPagesReorder={handlePagesReorder}
                onPageAdd={handlePageAdd}
                onPageDelete={handlePageDelete}
                selectedBlockId={selectedBlockId}
                onBlockSelect={handleBlockSelect}
                onBlocksReorder={handleBlocksReorder}
                onBlockAdd={handleBlockAdd}
              />
            ) : (
              <ThemePanel theme={funnel.theme} />
            )}
            <Preview page={selectedPage} selectedBlockId={selectedBlockId} onBlockSelect={handleBlockSelect} />
            <InspectorPanel block={selectedBlock} onBlockUpdate={handleBlockUpdate} />
          </div>
        </div>
      </div>
    </div>
  )
}
