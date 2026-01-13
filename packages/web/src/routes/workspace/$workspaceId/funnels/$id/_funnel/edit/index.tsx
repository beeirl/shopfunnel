import { AlertDialog } from '@/components/ui/alert-dialog'
import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import type { Block, Info, Page, Rule, RuleAction, Theme } from '@shopfunnel/core/funnel/types'
import { Identifier } from '@shopfunnel/core/identifier'
import { useDebouncer } from '@tanstack/react-pacer'
import { mutationOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { getFunnelQueryOptions } from '../../-common'
import { getSessionQueryOptions } from '../../../../-common'
import { BlockPanel } from './-components/block-panel'
import { Canvas } from './-components/canvas'
import { LogicPanel } from './-components/logic-panel'
import { PagePanel } from './-components/page-panel'
import { PagesPanel } from './-components/pages-panel'
import { ThemePanel } from './-components/theme-panel'

const updateFunnel = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      funnelId: Identifier.schema('funnel'),
      pages: z.custom<Page[]>().optional(),
      rules: z.custom<Rule[]>().optional(),
      theme: z.custom<Theme>().optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Funnel.update({
          id: data.funnelId,
          pages: data.pages,
          rules: data.rules,
          theme: data.theme,
        }),
      data.workspaceId,
    )
  })

const updateFunnelMutationOptions = (workspaceId: string, funnelId: string) =>
  mutationOptions({
    mutationFn: (data: { pages?: Page[]; rules?: Rule[]; theme?: Theme }) =>
      updateFunnel({ data: { workspaceId, funnelId, ...data } }),
  })

const uploadFunnelFile = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error('Expected FormData')
    }
    const file = input.get('file') as File
    const workspaceId = input.get('workspaceId') as string
    const funnelId = input.get('funnelId') as string

    if (!file || !workspaceId || !funnelId) {
      throw new Error('Missing required fields')
    }

    return { file, workspaceId, funnelId }
  })
  .handler(async ({ data }) => {
    const arrayBuffer = await data.file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return withActor(async () => {
      const result = await Funnel.createFile({
        funnelId: data.funnelId,
        contentType: data.file.type,
        data: buffer,
        name: data.file.name,
        size: data.file.size,
      })
      return result.url
    }, data.workspaceId)
  })

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel/edit/')({
  component: RouteComponent,
  ssr: false,
  beforeLoad: async ({ context, params }) => {
    const session = await context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId))
    if (!session.isAdmin) {
      throw redirect({ to: '/workspace/$workspaceId/funnels/$id/insights', params })
    }
  },
})

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const funnelQuery = useSuspenseQuery(getFunnelQueryOptions(params.workspaceId, params.id))
  const updateFunnelMutation = useMutation(updateFunnelMutationOptions(params.workspaceId, params.id))

  const saveDebouncer = useDebouncer(
    async (data: { pages: Page[]; rules?: Rule[]; theme?: Theme }) => {
      await updateFunnelMutation.mutateAsync(data)
      queryClient.setQueryData(
        getFunnelQueryOptions(params.workspaceId, params.id).queryKey,
        (funnel: Info | undefined) => (funnel ? { ...funnel, published: false } : funnel),
      )
    },
    { wait: 3000 },
  )

  const [funnel, setFunnel] = React.useState<Info>(funnelQuery.data)

  React.useEffect(() => {
    setFunnel(funnelQuery.data)
  }, [funnelQuery.data])

  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(funnel.pages[0]?.id ?? null)
  const selectedPage = funnel.pages.find((page) => page.id === selectedPageId) ?? null

  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
  const selectedBlock = funnel.pages.flatMap((p) => p.blocks).find((b) => b.id === selectedBlockId) ?? null

  const [showThemePanel, setShowThemePanel] = React.useState(false)
  const [selectionSource, setSelectionSource] = React.useState<'panel' | 'canvas' | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const [selectedLogicPageId, setSelectedLogicPageId] = React.useState<string | null>(null)
  const selectedLogicPage = funnel.pages.find((p) => p.id === selectedLogicPageId) ?? null

  // Pending page rules - track unsaved changes per page
  const [pendingPageRules, setPendingPageRules] = React.useState<Record<string, Rule | null>>({})

  // Get rules for a specific page (pending takes priority over saved)
  const getPageRule = (pageId: string): Rule | undefined => {
    if (pageId in pendingPageRules) {
      return pendingPageRules[pageId] ?? undefined
    }
    return funnel.rules.find((r) => r.pageId === pageId)
  }

  // Derive effective rules (saved + pending) for real-time canvas preview
  const effectiveRules = React.useMemo(() => {
    const rulesMap = new Map(funnel.rules.map((r) => [r.pageId, r]))

    // Apply pending changes
    for (const [pageId, pendingRule] of Object.entries(pendingPageRules)) {
      if (pendingRule === null) {
        rulesMap.delete(pageId) // Rule was deleted
      } else {
        rulesMap.set(pageId, pendingRule) // Rule was added/modified
      }
    }

    return Array.from(rulesMap.values())
  }, [funnel.rules, pendingPageRules])

  // Derive what's being deleted
  const deleteTarget = selectedBlockId ? 'block' : selectedPageId ? 'page' : null

  // Handle keyboard shortcuts for delete
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (selectedBlockId) {
          event.preventDefault()
          setDeleteDialogOpen(true)
        } else if (selectedPageId) {
          event.preventDefault()
          setDeleteDialogOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBlockId, selectedPageId])

  const handleDeleteConfirm = () => {
    if (selectedBlockId) {
      handleBlockDelete(selectedBlockId)
    } else if (selectedPageId) {
      handlePageDelete(selectedPageId)
    }
    setDeleteDialogOpen(false)
  }

  const handlePageSelect = (pageId: string | null, source: 'panel' | 'canvas' = 'canvas') => {
    setSelectedPageId(pageId)
    setSelectionSource(source)
    setShowThemePanel(false)
    setSelectedLogicPageId(null)
  }

  const handleBlockSelect = (blockId: string | null, source: 'panel' | 'canvas' = 'canvas') => {
    setSelectedBlockId(blockId)
    setSelectionSource(source)
    setShowThemePanel(false)
    setSelectedLogicPageId(null)
  }

  const handleThemeUpdate = (updates: Partial<Theme>) => {
    const updatedTheme = { ...funnel.theme, ...updates }
    const updatedFunnel = { ...funnel, theme: updatedTheme, published: false }
    setFunnel(updatedFunnel)
    saveDebouncer.maybeExecute({ pages: updatedFunnel.pages, theme: updatedTheme })
  }

  const handleBlocksReorder = (pageId: string, reorderedBlocks: Block[]) => {
    const updatedPages = funnel.pages.map((page) => (page.id === pageId ? { ...page, blocks: reorderedBlocks } : page))
    const updatedFunnel = { ...funnel, pages: updatedPages, published: false }
    setFunnel(updatedFunnel)
    saveDebouncer.maybeExecute({ pages: updatedFunnel.pages })
  }

  const handleBlockAdd = (addedBlock: Block, pageId: string, index?: number) => {
    const updatedPages = funnel.pages.map((page) => {
      if (page.id !== pageId) return page
      if (index !== undefined) {
        const newBlocks = [...page.blocks]
        newBlocks.splice(index, 0, addedBlock)
        return { ...page, blocks: newBlocks }
      }
      return { ...page, blocks: [...page.blocks, addedBlock] }
    })

    const updatedFunnel = { ...funnel, pages: updatedPages, published: false }
    setFunnel(updatedFunnel)
    setSelectedBlockId(addedBlock.id)
    saveDebouncer.maybeExecute({ pages: updatedFunnel.pages })
  }

  const handleBlockUpdate = (id: string, updatedBlock: Partial<Block>) => {
    const updatedPages = funnel.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) => (block.id === id ? ({ ...block, ...updatedBlock } as Block) : block)),
    }))
    const updatedFunnel = { ...funnel, pages: updatedPages, published: false }
    setFunnel(updatedFunnel)
    saveDebouncer.maybeExecute({ pages: updatedFunnel.pages })
  }

  // HTML block change - updates state for live preview but does NOT trigger save
  const handleHtmlBlockChange = (id: string, html: string) => {
    const updatedPages = funnel.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) =>
        block.id === id && block.type === 'html' ? { ...block, properties: { ...block.properties, html } } : block,
      ),
    }))
    setFunnel({ ...funnel, pages: updatedPages, published: false })
    // Note: NO saveDebouncer.maybeExecute() call here - only save on explicit Save button click
  }

  // HTML block save - triggers save with current funnel state
  const handleHtmlBlockSave = () => {
    saveDebouncer.maybeExecute({ pages: funnel.pages })
  }

  const handlePageUpdate = (pageId: string, updates: Partial<Page>) => {
    const updatedPages = funnel.pages.map((page) => (page.id === pageId ? { ...page, ...updates } : page))
    const updatedFunnel = { ...funnel, pages: updatedPages, published: false }
    setFunnel(updatedFunnel)
    saveDebouncer.maybeExecute({ pages: updatedFunnel.pages })
  }

  const handleBlockDelete = (blockId: string) => {
    setFunnel((prev) => {
      const updatedPages = prev.pages.map((page) => {
        if (!page.blocks.some((block) => block.id === blockId)) return page
        return { ...page, blocks: page.blocks.filter((block) => block.id !== blockId) }
      })
      setSelectedBlockId(null)
      const updated = { ...prev, pages: updatedPages, published: false }
      saveDebouncer.maybeExecute({ pages: updated.pages })
      return updated
    })
  }

  const handlePagesReorder = (reorderedPages: Page[]) => {
    const updated = { ...funnel, pages: reorderedPages, published: false }
    setFunnel(updated)
    saveDebouncer.maybeExecute({ pages: updated.pages })
  }

  const handlePageAdd = (page: Page) => {
    const newPages = [...funnel.pages, page]
    const updated = { ...funnel, pages: newPages, published: false }
    setFunnel(updated)
    setSelectedPageId(page.id)
    setSelectedBlockId(page.blocks[0]?.id ?? null)
    saveDebouncer.maybeExecute({ pages: updated.pages })
  }

  const handlePageDelete = (pageId: string) => {
    setFunnel((prev) => {
      const pageIndex = prev.pages.findIndex((page) => page.id === pageId)
      const updatedPages = prev.pages.filter((page) => page.id !== pageId)
      const newIndex = Math.max(0, pageIndex - 1)
      const newSelectedPage = updatedPages[newIndex] ?? null
      setSelectedPageId(newSelectedPage?.id ?? null)
      setSelectedBlockId(newSelectedPage?.blocks[0]?.id ?? null)
      const updated = { ...prev, pages: updatedPages, published: false }
      saveDebouncer.maybeExecute({ pages: updated.pages })
      return updated
    })
  }

  const handleImageUpload = async (file: globalThis.File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('workspaceId', params.workspaceId)
    formData.append('funnelId', params.id)

    return uploadFunnelFile({ data: formData })
  }

  const handleThemeButtonClick = () => {
    if (showThemePanel) {
      setShowThemePanel(false)
    } else {
      setSelectedPageId(null)
      setSelectedBlockId(null)
      setSelectedLogicPageId(null)
      setShowThemePanel(true)
    }
  }

  const handleLogicClick = (pageId: string) => {
    setSelectedLogicPageId(pageId)
    setSelectedPageId(null)
    setSelectedBlockId(null)
    setShowThemePanel(false)
  }

  const handlePageRulesChange = (actions: RuleAction[]) => {
    if (!selectedLogicPageId) return
    setPendingPageRules((prev) => ({
      ...prev,
      [selectedLogicPageId]: actions.length > 0 ? { pageId: selectedLogicPageId, actions } : null,
    }))
  }

  const handlePageRulesSave = () => {
    if (!selectedLogicPageId) return
    const pendingRule = pendingPageRules[selectedLogicPageId]

    // Merge pending into funnel.rules
    const newRules = funnel.rules.filter((r) => r.pageId !== selectedLogicPageId)
    if (pendingRule && pendingRule.actions.length > 0) {
      newRules.push(pendingRule)
    }

    setFunnel((prev) => ({ ...prev, rules: newRules }))

    // Clear pending for this page
    setPendingPageRules((prev) => {
      const { [selectedLogicPageId]: _, ...rest } = prev
      return rest
    })

    // Save to server
    saveDebouncer.maybeExecute({ pages: funnel.pages, rules: newRules })
  }

  const handlePageRulesReset = () => {
    if (!selectedLogicPageId) return
    setPendingPageRules((prev) => {
      const { [selectedLogicPageId]: _, ...rest } = prev
      return rest
    })
  }

  const handleLogicClose = () => {
    setSelectedLogicPageId(null)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <PagesPanel
        pages={funnel.pages}
        selectedPageId={selectedPageId}
        selectedBlockId={selectedBlockId}
        onPageSelect={(pageId) => handlePageSelect(pageId, 'panel')}
        onBlockSelect={(blockId) => handleBlockSelect(blockId, 'panel')}
        onPagesReorder={handlePagesReorder}
        onPageAdd={handlePageAdd}
        onBlocksReorder={handleBlocksReorder}
        onBlockAdd={(block) => {
          const pageId =
            selectedPageId ||
            (selectedBlockId
              ? funnel.pages.find((page) => page.blocks.some((b) => b.id === selectedBlockId))?.id
              : null)
          if (pageId) {
            handleBlockAdd(block, pageId)
          }
        }}
      />
      <Canvas
        pages={funnel.pages}
        rules={effectiveRules}
        theme={funnel.theme}
        selectedPageId={selectedPageId}
        selectedBlockId={selectedBlockId}
        selectionSource={selectionSource}
        onPageSelect={handlePageSelect}
        onBlockSelect={handleBlockSelect}
        onThemeButtonClick={handleThemeButtonClick}
        onLogicClick={handleLogicClick}
      />
      {selectedLogicPage ? (
        <LogicPanel
          page={selectedLogicPage}
          pages={funnel.pages}
          pageRule={getPageRule(selectedLogicPage.id)}
          saving={updateFunnelMutation.isPending}
          hasChanges={selectedLogicPage.id in pendingPageRules}
          onPageRulesChange={handlePageRulesChange}
          onSave={handlePageRulesSave}
          onReset={handlePageRulesReset}
          onClose={handleLogicClose}
        />
      ) : showThemePanel ? (
        <ThemePanel theme={funnel.theme} onThemeUpdate={handleThemeUpdate} onImageUpload={handleImageUpload} />
      ) : selectedBlock ? (
        <BlockPanel
          block={selectedBlock}
          onBlockUpdate={(block) => handleBlockUpdate(selectedBlock.id, block)}
          onImageUpload={handleImageUpload}
          onBlockRemove={() => setDeleteDialogOpen(true)}
          onHtmlChange={(html) => handleHtmlBlockChange(selectedBlock.id, html)}
          onHtmlSave={handleHtmlBlockSave}
        />
      ) : selectedPage ? (
        <PagePanel
          page={selectedPage}
          onPageUpdate={(updates) => handlePageUpdate(selectedPage.id, updates)}
          onPageRemove={() => setDeleteDialogOpen(true)}
        />
      ) : null}

      <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>Remove {deleteTarget}?</AlertDialog.Title>
            <AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action variant="destructive" onClick={handleDeleteConfirm}>
              Remove
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  )
}
