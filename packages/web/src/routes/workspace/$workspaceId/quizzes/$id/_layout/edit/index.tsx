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
import { BlockPane } from './-components/block-pane'
import { Canvas } from './-components/canvas'
import { Panel } from './-components/panel'

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

export const Route = createFileRoute('/workspace/$workspaceId/quizzes/$id/_layout/edit/')({
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

  // Sync local state when query data changes (e.g., after publish)
  React.useEffect(() => {
    setQuiz(quizQuery.data)
  }, [quizQuery.data])

  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(quiz.pages[0]?.id ?? null)
  const selectedPage = quiz.pages.find((page) => page.id === selectedPageId) ?? null

  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
  const selectedBlock = quiz.pages.flatMap((p) => p.blocks).find((b) => b.id === selectedBlockId) ?? null

  const handlePageSelect = (pageId: string | null) => {
    setSelectedPageId(pageId)
    if (pageId) {
      const page = quiz.pages.find((p) => p.id === pageId)
      setSelectedBlockId(page?.blocks[0]?.id ?? null)
    }
  }

  const handleBlockSelect = (blockId: string | null) => {
    setSelectedBlockId(blockId)
  }

  const handlePagesReorder = (reorderedPages: Page[]) => {
    const updated = { ...quiz, pages: reorderedPages, published: false }
    setQuiz(updated)
    saveDebouncer.maybeExecute({ pages: updated.pages })
  }

  const handlePageAdd = (page: Page, index: number) => {
    const newPages = [...quiz.pages]
    newPages.splice(index, 0, page)
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

  const handleBlocksReorder = (pageId: string, reorderedBlocks: Block[]) => {
    const updatedPages = quiz.pages.map((page) => (page.id === pageId ? { ...page, blocks: reorderedBlocks } : page))
    const updatedQuiz = { ...quiz, pages: updatedPages, published: false }
    setQuiz(updatedQuiz)
    saveDebouncer.maybeExecute({ pages: updatedQuiz.pages })
  }

  const handleBlockAdd = (addedBlock: Block) => {
    if (!selectedPageId) return
    const updatedPages = quiz.pages.map((page) =>
      page.id === selectedPageId ? { ...page, blocks: [...page.blocks, addedBlock] } : page,
    )
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

  const handleBlockDelete = (blockId: string) => {
    setQuiz((prev) => {
      const updatedPages = prev.pages.map((page) => {
        const blockIndex = page.blocks.findIndex((block) => block.id === blockId)
        if (blockIndex === -1) return page

        const updatedBlocks = page.blocks.filter((block) => block.id !== blockId)
        const newIndex = Math.max(0, blockIndex - 1)
        const newSelectedBlock = updatedBlocks[newIndex] ?? null
        setSelectedBlockId(newSelectedBlock?.id ?? null)
        return { ...page, blocks: updatedBlocks }
      })
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

  return (
    <div className="flex flex-1 overflow-hidden">
      <Canvas
        pages={quiz.pages}
        theme={quiz.theme}
        selectedPageId={selectedPageId}
        selectedBlockId={selectedBlockId}
        onPageSelect={handlePageSelect}
        onBlockSelect={handleBlockSelect}
        onPagesReorder={handlePagesReorder}
        onPageAdd={handlePageAdd}
        onPageDelete={handlePageDelete}
        onBlocksReorder={handleBlocksReorder}
        onBlockAdd={handleBlockAdd}
        onBlockDelete={handleBlockDelete}
      />
      {selectedBlock && (
        <Panel>
          <BlockPane
            block={selectedBlock}
            onBlockUpdate={(block) => handleBlockUpdate(selectedBlock.id, block)}
            onImageUpload={handleImageUpload}
          />
        </Panel>
      )}
    </div>
  )
}
