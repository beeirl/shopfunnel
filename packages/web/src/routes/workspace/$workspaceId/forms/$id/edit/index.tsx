import { Button } from '@/components/ui/button'
import { Resizable } from '@/components/ui/resizable'
import { withActor } from '@/context/auth.withActor'
import { Preview } from '@/routes/workspace/$workspaceId/forms/$id/edit/-components/preview'
import { Form } from '@shopfunnel/core/form/index'
import type { Block, Info, Page, Theme } from '@shopfunnel/core/form/types'
import { Identifier } from '@shopfunnel/core/identifier'
import { useDebouncer } from '@tanstack/react-pacer'
import { mutationOptions, queryOptions, useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { BlockPane } from './-components/block-pane'
import { BlocksPane } from './-components/blocks-pane'
import { PagePane } from './-components/page-pane'
import { PagesPane } from './-components/pages-pane'
import { Panel } from './-components/panel'
import { ThemePopover } from './-components/theme-popover'

const getForm = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      formId: Identifier.schema('form'),
    }),
  )
  .handler(({ data }) => {
    return withActor(async () => {
      const form = await Form.getCurrentVersion(data.formId)
      if (!form) throw notFound()
      return form
    }, data.workspaceId)
  })

const getFormQueryOptions = (workspaceId: string, formId: string) =>
  queryOptions({
    queryKey: ['form', workspaceId, formId],
    queryFn: () => getForm({ data: { workspaceId, formId } }),
  })

const updateForm = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      formId: Identifier.schema('form'),
      pages: z.custom<Page[]>().optional(),
      theme: z.custom<Theme>().optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Form.update({
          id: data.formId,
          pages: data.pages,
          theme: data.theme,
        }),
      data.workspaceId,
    )
  })

const updateFormMutationOptions = (workspaceId: string, formId: string) =>
  mutationOptions({
    mutationFn: (data: { pages?: Page[]; theme?: Theme }) => updateForm({ data: { workspaceId, formId, ...data } }),
  })

const publishForm = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      formId: Identifier.schema('form'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Form.publish(data.formId), data.workspaceId)
  })

const publishFormMutationOptions = (workspaceId: string, formId: string) =>
  mutationOptions({
    mutationFn: () => publishForm({ data: { workspaceId, formId } }),
  })

const uploadFormFile = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error('Expected FormData')
    }
    const file = input.get('file') as File
    const workspaceId = input.get('workspaceId') as string
    const formId = input.get('formId') as string

    if (!file || !workspaceId || !formId) {
      throw new Error('Missing required fields')
    }

    return { file, workspaceId, formId }
  })
  .handler(async ({ data }) => {
    const arrayBuffer = await data.file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return withActor(async () => {
      const result = await Form.createFile({
        formId: data.formId,
        contentType: data.file.type,
        data: buffer,
        name: data.file.name,
        size: data.file.size,
      })
      return result.url
    }, data.workspaceId)
  })

export const Route = createFileRoute('/workspace/$workspaceId/forms/$id/edit/')({
  component: RouteComponent,
  ssr: false,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(getFormQueryOptions(params.workspaceId, params.id))
  },
})

function RouteComponent() {
  const params = Route.useParams()

  const formQuery = useSuspenseQuery(getFormQueryOptions(params.workspaceId, params.id))
  const updateFormMutation = useMutation(updateFormMutationOptions(params.workspaceId, params.id))
  const publishFormMutation = useMutation(publishFormMutationOptions(params.workspaceId, params.id))

  const saveDebouncer = useDebouncer(
    (data: { pages: Page[]; theme?: Theme }) => {
      updateFormMutation.mutate(data)
    },
    { wait: 1000 },
  )

  const [form, setForm] = React.useState<Info>(formQuery.data)

  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(form.pages[0]?.id ?? null)
  const selectedPages = form.pages.find((page) => page.id === selectedPageId) ?? null

  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
  const selectedBlocks = selectedPages?.blocks.find((b) => b.id === selectedBlockId) ?? null

  const handlePageSelect = (pageId: string) => {
    setSelectedPageId(pageId)
    const page = form.pages.find((p) => p.id === pageId)
    setSelectedBlockId(page?.blocks[0]?.id ?? null)
  }

  const handlePagesReorder = (reorderedPages: Page[]) => {
    const updated = { ...form, pages: reorderedPages, published: false }
    setForm(updated)
    saveDebouncer.maybeExecute({ pages: updated.pages })
  }

  const handlePageAdd = (page: Page) => {
    const updated = { ...form, pages: [...form.pages, page], published: false }
    setForm(updated)
    setSelectedPageId(page.id)
    setSelectedBlockId(page.blocks[0]?.id ?? null)
    saveDebouncer.maybeExecute({ pages: updated.pages })
  }

  const handlePageDelete = (pageId: string) => {
    setForm((prev) => {
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

  const handleBlockSelect = (blockId: string | null) => {
    setSelectedBlockId(blockId)
  }

  const handlePageUpdate = (id: string, updatedPage: Partial<Page>) => {
    const updatedPages = form.pages.map((page) => (page.id === id ? ({ ...page, ...updatedPage } as Page) : page))
    const updatedForm = { ...form, pages: updatedPages, published: false }
    setForm(updatedForm)
    saveDebouncer.maybeExecute({ pages: updatedForm.pages })
  }

  const handleBlocksReorder = (reorderedBlocks: Block[]) => {
    if (!selectedPageId) return
    const updatedPages = form.pages.map((page) =>
      page.id === selectedPageId ? { ...page, blocks: reorderedBlocks } : page,
    )
    const updatedForm = { ...form, pages: updatedPages, published: false }
    setForm(updatedForm)
    saveDebouncer.maybeExecute({ pages: updatedForm.pages })
  }

  const handleBlockAdd = (addedBlock: Block) => {
    if (!selectedPageId) return
    const updatedPages = form.pages.map((page) =>
      page.id === selectedPageId ? { ...page, blocks: [...page.blocks, addedBlock] } : page,
    )
    const updatedForm = { ...form, pages: updatedPages, published: false }
    setForm(updatedForm)
    setSelectedBlockId(addedBlock.id)
    saveDebouncer.maybeExecute({ pages: updatedForm.pages })
  }

  const handleBlockUpdate = (id: string, updatedBlock: Partial<Block>) => {
    const updatedPages = form.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) => (block.id === id ? ({ ...block, ...updatedBlock } as Block) : block)),
    }))
    const updatedForm = { ...form, pages: updatedPages, published: false }
    setForm(updatedForm)
    saveDebouncer.maybeExecute({ pages: updatedForm.pages })
  }

  const handleBlockDelete = (blockId: string) => {
    if (!selectedPageId) return
    setForm((prev) => {
      const updatedPages = prev.pages.map((page) => {
        if (page.id !== selectedPageId) return page
        const blockIndex = page.blocks.findIndex((block) => block.id === blockId)
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

  const handleThemeUpdate = (updatedTheme: Partial<Theme>) => {
    const updatedForm = {
      ...form,
      theme: { ...form.theme, ...updatedTheme },
      published: false,
    }
    setForm(updatedForm)
    saveDebouncer.maybeExecute({
      pages: updatedForm.pages,
      theme: updatedForm.theme,
    })
  }

  const handleImageUpload = async (file: globalThis.File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('workspaceId', params.workspaceId)
    formData.append('formId', params.id)

    return uploadFormFile({ data: formData })
  }

  return (
    <div className="flex h-screen w-screen flex-col">
      <div className="flex h-12 w-full shrink-0 items-center border-b px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{form.title}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center justify-end gap-1">
          <ThemePopover.Root>
            <ThemePopover.Trigger render={<Button variant="ghost" aria-label="Theme" />}>Design</ThemePopover.Trigger>
            <ThemePopover.Content align="end" theme={form.theme} onThemeUpdate={handleThemeUpdate} />
          </ThemePopover.Root>
          <Button
            variant="ghost"
            render={<Link to="/workspace/$workspaceId/forms/$id/preview" params={params} target="_blank" />}
          >
            Preview
          </Button>
          <Button
            disabled={form.published || publishFormMutation.isPending}
            variant={form.published ? 'ghost' : 'default'}
            onClick={() => {
              publishFormMutation.mutate(undefined, {
                onSuccess: () => {
                  setForm((prev) => ({ ...prev, published: true, publishedAt: new Date() }))
                },
              })
            }}
          >
            Publish
          </Button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Panel className="w-[250px]">
          <Resizable.PanelGroup direction="vertical">
            <Resizable.Panel defaultSize={selectedPageId ? 40 : 100} minSize={20}>
              <PagesPane
                pages={form.pages}
                selectedPageId={selectedPageId}
                onPageSelect={handlePageSelect}
                onPagesReorder={handlePagesReorder}
                onPageAdd={handlePageAdd}
                onPageDelete={handlePageDelete}
              />
            </Resizable.Panel>
            {selectedPageId && (
              <React.Fragment>
                <Resizable.Handle />
                <Resizable.Panel defaultSize={60} minSize={20}>
                  <BlocksPane
                    blocks={selectedPages?.blocks ?? []}
                    selectedBlockId={selectedBlockId}
                    onBlockSelect={handleBlockSelect}
                    onBlocksReorder={handleBlocksReorder}
                    onBlockAdd={handleBlockAdd}
                    onBlockDelete={handleBlockDelete}
                  />
                </Resizable.Panel>
              </React.Fragment>
            )}
          </Resizable.PanelGroup>
        </Panel>
        <Preview
          page={selectedPages}
          theme={form.theme}
          selectedBlockId={selectedBlockId}
          onBlockSelect={handleBlockSelect}
        />
        {selectedBlocks ? (
          <Panel className="w-[350px]">
            <BlockPane
              data={selectedBlocks}
              onDataUpdate={(data) => handleBlockUpdate(selectedBlocks.id, data)}
              onImageUpload={handleImageUpload}
            />
          </Panel>
        ) : selectedPages ? (
          <Panel className="w-[350px]">
            <PagePane
              page={selectedPages}
              index={form.pages.findIndex((p) => p.id === selectedPageId)}
              onPageUpdate={(page) => handlePageUpdate(selectedPages.id, page)}
            />
          </Panel>
        ) : null}
      </div>
    </div>
  )
}
