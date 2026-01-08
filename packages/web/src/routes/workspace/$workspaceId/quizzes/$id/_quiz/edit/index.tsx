import { AlertDialog } from '@/components/ui/alert-dialog'
import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Quiz } from '@shopfunnel/core/quiz/index'
import type { Block, Info, Page, Theme } from '@shopfunnel/core/quiz/types'
import { useDebouncer } from '@tanstack/react-pacer'
import { mutationOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { getQuizQueryOptions } from '../../-common'
import { BlockPanel } from './-components/block-panel'
import { Canvas } from './-components/canvas'
import { PagePanel } from './-components/page-panel'
import { PagesPanel } from './-components/pages-panel'
import { ThemePanel } from './-components/theme-panel'

const updateQuiz = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      quizId: Identifier.schema('quiz'),
      pages: z.custom<Page[]>().optional(),
      theme: z.custom<Theme>().optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Quiz.update({
          id: data.quizId,
          pages: data.pages,
          theme: data.theme,
        }),
      data.workspaceId,
    )
  })

const updateQuizMutationOptions = (workspaceId: string, quizId: string) =>
  mutationOptions({
    mutationFn: (data: { pages?: Page[]; theme?: Theme }) => updateQuiz({ data: { workspaceId, quizId, ...data } }),
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
    async (data: { pages: Page[]; theme?: Theme }) => {
      await updateQuizMutation.mutateAsync(data)
      queryClient.setQueryData(getQuizQueryOptions(params.workspaceId, params.id).queryKey, (quiz: Info | undefined) =>
        quiz ? { ...quiz, published: false } : quiz,
      )
    },
    { wait: 1000 },
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
    if (pageId) {
      setShowThemePanel(false)
    }
  }

  const handleBlockSelect = (blockId: string | null, source: 'panel' | 'canvas' = 'canvas') => {
    setSelectedBlockId(blockId)
    setSelectionSource(source)
    if (blockId) setShowThemePanel(false)
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
      setShowThemePanel(true)
    }
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
        onBlocksReorder={(blocks) => selectedPageId && handleBlocksReorder(selectedPageId, blocks)}
        onBlockAdd={(block) => selectedPageId && handleBlockAdd(block, selectedPageId)}
      />
      <Canvas
        pages={quiz.pages}
        rules={quiz.rules}
        theme={quiz.theme}
        selectedPageId={selectedPageId}
        selectedBlockId={selectedBlockId}
        selectionSource={selectionSource}
        onPageSelect={handlePageSelect}
        onBlockSelect={handleBlockSelect}
        onThemeButtonClick={handleThemeButtonClick}
      />
      {showThemePanel ? (
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
