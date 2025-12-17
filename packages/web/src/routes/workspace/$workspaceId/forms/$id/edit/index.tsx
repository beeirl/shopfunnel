import { Button } from '@/components/ui/button'
import { withActor } from '@/context/auth.withActor'
import { LeftPanel } from '@/routes/workspace/$workspaceId/forms/$id/edit/-components/left-panel'
import { type NavbarTab } from '@/routes/workspace/$workspaceId/forms/$id/edit/-components/navbar'
import { Preview } from '@/routes/workspace/$workspaceId/forms/$id/edit/-components/preview'
import { ThemePanel } from '@/routes/workspace/$workspaceId/forms/$id/edit/-components/theme-panel'
import { Form } from '@shopfunnel/core/form/index'
import type { Block, FormSchema, Page } from '@shopfunnel/core/form/schema'
import type { FormTheme } from '@shopfunnel/core/form/theme'
import { Identifier } from '@shopfunnel/core/identifier'
import { useDebouncer } from '@tanstack/react-pacer'
import { mutationOptions, queryOptions, useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { ulid } from 'ulid'
import { z } from 'zod'
import { RightPanel } from './-components/right-panel'

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
      schema: z.custom<FormSchema>().optional(),
      theme: z.custom<FormTheme>().optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Form.update({
          id: data.formId,
          schema: data.schema,
          theme: data.theme,
        }),
      data.workspaceId,
    )
  })

const updateFormMutationOptions = (workspaceId: string, formId: string) =>
  mutationOptions({
    mutationFn: (data: { schema?: FormSchema; theme?: FormTheme }) =>
      updateForm({ data: { workspaceId, formId, ...data } }),
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

  const [form, setForm] = React.useState<Form.Info>(() => formQuery.data)
  const [selectedPageId, setSelectedPageId] = React.useState(() => form.schema.pages[0]?.id ?? null)
  const [selectedBlockId, setSelectedBlockId] = React.useState(() => form.schema.pages[0]?.blocks[0]?.id ?? null)
  const [activeTab, setActiveTab] = React.useState<NavbarTab>('explorer')

  const updateFormMutation = useMutation(updateFormMutationOptions(params.workspaceId, params.id))
  const publishFormMutation = useMutation(publishFormMutationOptions(params.workspaceId, params.id))

  const saveDebouncer = useDebouncer(
    (data: { schema: FormSchema; theme?: FormTheme }) => {
      updateFormMutation.mutate(data)
    },
    { wait: 1000 },
  )

  const selectedPage = form.schema.pages.find((page) => page.id === selectedPageId) ?? null
  const selectedBlock = selectedPage?.blocks.find((b) => b.id === selectedBlockId) ?? null

  const handlePageSelect = (pageId: string) => {
    setSelectedPageId(pageId)
    const page = form.schema.pages.find((p) => p.id === pageId)
    setSelectedBlockId(page?.blocks[0]?.id ?? null)
  }

  const handlePagesReorder = (reorderedPages: Page[]) => {
    const updatedSchema = { ...form.schema, pages: reorderedPages }
    const updated = { ...form, schema: updatedSchema, published: false }
    setForm(updated)
    saveDebouncer.maybeExecute({ schema: updated.schema })
  }

  const handlePageAdd = () => {
    const newPage: Page = {
      id: ulid(),
      blocks: [],
    }
    const updatedSchema = { ...form.schema, pages: [...form.schema.pages, newPage] }
    const updated = { ...form, schema: updatedSchema, published: false }
    setForm(updated)
    setSelectedPageId(newPage.id)
    setSelectedBlockId(null)
    saveDebouncer.maybeExecute({ schema: updated.schema })
  }

  const handlePageDelete = (pageId: string) => {
    setForm((prev) => {
      const pageIndex = prev.schema.pages.findIndex((page) => page.id === pageId)
      const updatedPages = prev.schema.pages.filter((page) => page.id !== pageId)
      const newIndex = Math.max(0, pageIndex - 1)
      const newSelectedPage = updatedPages[newIndex] ?? null
      setSelectedPageId(newSelectedPage?.id ?? null)
      setSelectedBlockId(newSelectedPage?.blocks[0]?.id ?? null)
      const updatedSchema = { ...prev.schema, pages: updatedPages }
      const updated = { ...prev, schema: updatedSchema, published: false }
      saveDebouncer.maybeExecute({ schema: updated.schema })
      return updated
    })
  }

  const handleBlockSelect = (blockId: string | null) => {
    setSelectedBlockId(blockId)
  }

  const handleBlocksReorder = (reorderedBlocks: Block[]) => {
    if (!selectedPageId) return
    const updatedPages = form.schema.pages.map((page) =>
      page.id === selectedPageId ? { ...page, blocks: reorderedBlocks } : page,
    )
    const updatedSchema = { ...form.schema, pages: updatedPages }
    const updated = { ...form, schema: updatedSchema, published: false }
    setForm(updated)
    saveDebouncer.maybeExecute({ schema: updated.schema })
  }

  const handleBlockAdd = (block: Block) => {
    if (!selectedPageId) return
    const updatedPages = form.schema.pages.map((page) =>
      page.id === selectedPageId ? { ...page, blocks: [...page.blocks, block] } : page,
    )
    const updatedSchema = { ...form.schema, pages: updatedPages }
    const updated = { ...form, schema: updatedSchema, published: false }
    setForm(updated)
    setSelectedBlockId(block.id)
    saveDebouncer.maybeExecute({ schema: updated.schema })
  }

  const handleBlockUpdate = (blockId: string, updates: Partial<Block>) => {
    const updatedPages = form.schema.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((b) => (b.id === blockId ? ({ ...b, ...updates } as Block) : b)),
    }))
    const updatedSchema = { ...form.schema, pages: updatedPages }
    const updated = { ...form, schema: updatedSchema, published: false }
    setForm(updated)
    saveDebouncer.maybeExecute({ schema: updated.schema })
  }

  const handleThemeUpdate = (updates: Partial<FormTheme>) => {
    const updated = {
      ...form,
      theme: { ...form.theme, ...updates },
      published: false,
    }
    setForm(updated)
    saveDebouncer.maybeExecute({
      schema: updated.schema,
      theme: updated.theme,
    })
  }

  return (
    <div className="flex h-screen w-screen">
      <div className="relative flex h-full min-h-32 w-full flex-col">
        <div className="relative z-10 flex h-full w-full flex-1 flex-col">
          <div className="flex h-12 w-full shrink-0 items-center gap-2 border-b px-4">
            <div className="flex w-56 items-center gap-2">
              <span className="truncate text-sm font-medium">{form.title}</span>
            </div>
            <div className="ml-auto flex items-center justify-end gap-1">
              <Button variant="ghost">Design</Button>
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
            {activeTab === 'explorer' ? (
              <LeftPanel
                pages={form.schema.pages}
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
              <ThemePanel theme={form.theme} onThemeUpdate={handleThemeUpdate} />
            )}
            <Preview
              page={selectedPage}
              theme={form.theme}
              selectedBlockId={selectedBlockId}
              onBlockSelect={handleBlockSelect}
            />
            <RightPanel block={selectedBlock} onBlockUpdate={handleBlockUpdate} />
          </div>
        </div>
      </div>
    </div>
  )
}
