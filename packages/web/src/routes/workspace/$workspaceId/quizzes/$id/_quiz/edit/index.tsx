import { AlertDialog } from '@/components/ui/alert-dialog'
import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Quiz } from '@shopfunnel/core/quiz/index'
import type { Block, Info, Page, Rule, RuleAction, Theme } from '@shopfunnel/core/quiz/types'
import { useDebouncer } from '@tanstack/react-pacer'
import { mutationOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { getQuizQueryOptions } from '../../-common'
import { BlockPanel } from './-components/block-panel'
import { Canvas } from './-components/canvas'
import { LogicPanel } from './-components/logic-panel'
import { PagePanel } from './-components/page-panel'
import { PagesPanel } from './-components/pages-panel'
import { ThemePanel } from './-components/theme-panel'

const updateQuiz = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      quizId: Identifier.schema('quiz'),
      pages: z.custom<Page[]>().optional(),
      rules: z.custom<Rule[]>().optional(),
      theme: z.custom<Theme>().optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Quiz.update({
          id: data.quizId,
          pages: data.pages,
          rules: data.rules,
          theme: data.theme,
        }),
      data.workspaceId,
    )
  })

const updateQuizMutationOptions = (workspaceId: string, quizId: string) =>
  mutationOptions({
    mutationFn: (data: { pages?: Page[]; rules?: Rule[]; theme?: Theme }) =>
      updateQuiz({ data: { workspaceId, quizId, ...data } }),
  })

const uploadQuizFile = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error('Expected FormData')
    }
    const file = input.get('file') as File
    const workspaceId = input.get('workspaceId') as string
    const quizId = input.get('quizId') as string

    if (!file || !workspaceId || !quizId) {
      throw new Error('Missing required fields')
    }

    return { file, workspaceId, quizId }
  })
  .handler(async ({ data }) => {
    const arrayBuffer = await data.file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return withActor(async () => {
      const result = await Quiz.createFile({
        quizId: data.quizId,
        contentType: data.file.type,
        data: buffer,
        name: data.file.name,
        size: data.file.size,
      })
      return result.url
    }, data.workspaceId)
  })

export const Route = createFileRoute('/workspace/$workspaceId/quizzes/$id/_quiz/edit/')({
  component: RouteComponent,
  ssr: false,
})

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const quizQuery = useSuspenseQuery(getQuizQueryOptions(params.workspaceId, params.id))
  const updateQuizMutation = useMutation(updateQuizMutationOptions(params.workspaceId, params.id))

  const saveDebouncer = useDebouncer(
    async (data: { pages: Page[]; rules?: Rule[]; theme?: Theme }) => {
      await updateQuizMutation.mutateAsync(data)
      queryClient.setQueryData(getQuizQueryOptions(params.workspaceId, params.id).queryKey, (quiz: Info | undefined) =>
        quiz ? { ...quiz, published: false } : quiz,
      )
    },
    { wait: 3000 },
  )

  const [quiz, setQuiz] = React.useState<Info>(quizQuery.data)

  React.useEffect(() => {
    setQuiz(quizQuery.data)
  }, [quizQuery.data])

  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(quiz.pages[0]?.id ?? null)
  const selectedPage = quiz.pages.find((page) => page.id === selectedPageId) ?? null

  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
  const selectedBlock = quiz.pages.flatMap((p) => p.blocks).find((b) => b.id === selectedBlockId) ?? null

  const [showThemePanel, setShowThemePanel] = React.useState(false)
  const [selectionSource, setSelectionSource] = React.useState<'panel' | 'canvas' | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const [selectedLogicPageId, setSelectedLogicPageId] = React.useState<string | null>(null)
  const selectedLogicPage = quiz.pages.find((p) => p.id === selectedLogicPageId) ?? null

  // Pending page rules - track unsaved changes per page
  const [pendingPageRules, setPendingPageRules] = React.useState<Record<string, Rule | null>>({})

  // Get rules for a specific page (pending takes priority over saved)
  const getPageRule = (pageId: string): Rule | undefined => {
    if (pageId in pendingPageRules) {
      return pendingPageRules[pageId] ?? undefined
    }
    return quiz.rules.find((r) => r.pageId === pageId)
  }

  // Derive effective rules (saved + pending) for real-time canvas preview
  const effectiveRules = React.useMemo(() => {
    const rulesMap = new Map(quiz.rules.map((r) => [r.pageId, r]))

    // Apply pending changes
    for (const [pageId, pendingRule] of Object.entries(pendingPageRules)) {
      if (pendingRule === null) {
        rulesMap.delete(pageId) // Rule was deleted
      } else {
        rulesMap.set(pageId, pendingRule) // Rule was added/modified
      }
    }

    return Array.from(rulesMap.values())
  }, [quiz.rules, pendingPageRules])

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
    const updatedTheme = { ...quiz.theme, ...updates }
    const updatedQuiz = { ...quiz, theme: updatedTheme, published: false }
    setQuiz(updatedQuiz)
    saveDebouncer.maybeExecute({ pages: updatedQuiz.pages, theme: updatedTheme })
  }

  const handleBlocksReorder = (pageId: string, reorderedBlocks: Block[]) => {
    const updatedPages = quiz.pages.map((page) => (page.id === pageId ? { ...page, blocks: reorderedBlocks } : page))
    const updatedQuiz = { ...quiz, pages: updatedPages, published: false }
    setQuiz(updatedQuiz)
    saveDebouncer.maybeExecute({ pages: updatedQuiz.pages })
  }

  const handleBlockAdd = (addedBlock: Block, pageId: string, index?: number) => {
    const updatedPages = quiz.pages.map((page) => {
      if (page.id !== pageId) return page
      if (index !== undefined) {
        const newBlocks = [...page.blocks]
        newBlocks.splice(index, 0, addedBlock)
        return { ...page, blocks: newBlocks }
      }
      return { ...page, blocks: [...page.blocks, addedBlock] }
    })

    const updatedQuiz = { ...quiz, pages: updatedPages, published: false }
    setQuiz(updatedQuiz)
    setSelectedBlockId(addedBlock.id)
    saveDebouncer.maybeExecute({ pages: updatedQuiz.pages })
  }

  const handleBlockUpdate = (id: string, updatedBlock: Partial<Block>) => {
    const updatedPages = quiz.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) => (block.id === id ? ({ ...block, ...updatedBlock } as Block) : block)),
    }))
    const updatedQuiz = { ...quiz, pages: updatedPages, published: false }
    setQuiz(updatedQuiz)
    saveDebouncer.maybeExecute({ pages: updatedQuiz.pages })
  }

  const handlePageUpdate = (pageId: string, updates: Partial<Page>) => {
    const updatedPages = quiz.pages.map((page) => (page.id === pageId ? { ...page, ...updates } : page))
    const updatedQuiz = { ...quiz, pages: updatedPages, published: false }
    setQuiz(updatedQuiz)
    saveDebouncer.maybeExecute({ pages: updatedQuiz.pages })
  }

  const handleBlockDelete = (blockId: string) => {
    setQuiz((prev) => {
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
    const updated = { ...quiz, pages: reorderedPages, published: false }
    setQuiz(updated)
    saveDebouncer.maybeExecute({ pages: updated.pages })
  }

  const handlePageAdd = (page: Page) => {
    const newPages = [...quiz.pages, page]
    const updated = { ...quiz, pages: newPages, published: false }
    setQuiz(updated)
    setSelectedPageId(page.id)
    setSelectedBlockId(page.blocks[0]?.id ?? null)
    saveDebouncer.maybeExecute({ pages: updated.pages })
  }

  const handlePageDelete = (pageId: string) => {
    setQuiz((prev) => {
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
    formData.append('quizId', params.id)

    return uploadQuizFile({ data: formData })
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

    // Merge pending into quiz.rules
    const newRules = quiz.rules.filter((r) => r.pageId !== selectedLogicPageId)
    if (pendingRule && pendingRule.actions.length > 0) {
      newRules.push(pendingRule)
    }

    setQuiz((prev) => ({ ...prev, rules: newRules }))

    // Clear pending for this page
    setPendingPageRules((prev) => {
      const { [selectedLogicPageId]: _, ...rest } = prev
      return rest
    })

    // Save to server
    saveDebouncer.maybeExecute({ pages: quiz.pages, rules: newRules })
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
        pages={quiz.pages}
        selectedPageId={selectedPageId}
        selectedBlockId={selectedBlockId}
        onPageSelect={(pageId) => handlePageSelect(pageId, 'panel')}
        onBlockSelect={(blockId) => handleBlockSelect(blockId, 'panel')}
        onPagesReorder={handlePagesReorder}
        onPageAdd={handlePageAdd}
        onBlocksReorder={handleBlocksReorder}
        onBlockAdd={(block) => selectedPageId && handleBlockAdd(block, selectedPageId)}
      />
      <Canvas
        pages={quiz.pages}
        rules={effectiveRules}
        theme={quiz.theme}
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
          pages={quiz.pages}
          pageRule={getPageRule(selectedLogicPage.id)}
          saving={updateQuizMutation.isPending}
          hasChanges={selectedLogicPage.id in pendingPageRules}
          onPageRulesChange={handlePageRulesChange}
          onSave={handlePageRulesSave}
          onReset={handlePageRulesReset}
          onClose={handleLogicClose}
        />
      ) : showThemePanel ? (
        <ThemePanel theme={quiz.theme} onThemeUpdate={handleThemeUpdate} onImageUpload={handleImageUpload} />
      ) : selectedBlock ? (
        <BlockPanel
          block={selectedBlock}
          onBlockUpdate={(block) => handleBlockUpdate(selectedBlock.id, block)}
          onImageUpload={handleImageUpload}
          onBlockRemove={() => setDeleteDialogOpen(true)}
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
