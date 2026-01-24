import { getBlockInfo } from '@/components/block'
import { Button } from '@/components/ui/button'
import { Menu } from '@/components/ui/menu'
import { Resizable } from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import type { Block, Page } from '@shopfunnel/core/funnel/types'
import {
  IconChevronDown as ChevronDownIcon,
  IconFile as FileIcon,
  IconLayoutGrid as LayoutGridIcon,
  IconListLetters as ListLettersIcon,
  IconLoader as LoaderIcon,
  IconMenu as MenuIcon,
  IconPlus as PlusIcon,
} from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'
import { useFunnelEditor } from '../-context'
import { useFunnel } from '../../-context'
import { Pane } from './pane'
import { Panel } from './panel'

// =============================================================================
// Block Factory
// =============================================================================

function createBlock(type: Block['type']): Block {
  switch (type) {
    case 'text_input':
      return {
        id: ulid(),
        type: 'text_input',
        properties: { name: 'Text Input', placeholder: '' },
        validations: { required: false },
      }
    case 'multiple_choice':
      return {
        id: ulid(),
        type: 'multiple_choice',
        properties: { name: 'Multiple Choice', options: [{ id: ulid(), label: 'Choice 1' }] },
        validations: { required: false },
      }
    case 'picture_choice':
      return {
        id: ulid(),
        type: 'picture_choice',
        properties: {
          name: 'Picture Choice',
          options: [
            { id: ulid(), label: 'Choice 1' },
            { id: ulid(), label: 'Choice 2' },
          ],
        },
        validations: { required: false },
      }
    case 'dropdown':
      return {
        id: ulid(),
        type: 'dropdown',
        properties: { name: 'Dropdown', placeholder: 'Select an option', options: [{ id: ulid(), label: 'Option 1' }] },
        validations: { required: false },
      }
    case 'heading':
      return { id: ulid(), type: 'heading', properties: { text: 'Heading', alignment: 'left' } }
    case 'paragraph':
      return { id: ulid(), type: 'paragraph', properties: { text: 'Paragraph', alignment: 'left' } }
    case 'gauge':
      return { id: ulid(), type: 'gauge', properties: { value: 50, minValue: 0, maxValue: 100 } }
    case 'list':
      return {
        id: ulid(),
        type: 'list',
        properties: {
          orientation: 'vertical',
          textPlacement: 'right',
          size: 'sm',
          items: [{ id: ulid(), title: 'Item', media: { type: 'emoji', value: '✓' } }],
        },
      }
    case 'image':
      return { id: ulid(), type: 'image', properties: {} }
    case 'loader':
      return { id: ulid(), type: 'loader', properties: { duration: 3000 } }
    case 'spacer':
      return { id: ulid(), type: 'spacer', properties: { size: 'md' } }
    case 'html':
      return { id: ulid(), type: 'html', properties: { html: '', media: [] } }
  }
}

// =============================================================================
// Page Factory
// =============================================================================

const PAGE_TEMPLATES = [
  { id: 'blank', icon: FileIcon, name: 'Blank', blocks: [] as Block['type'][] },
  { id: 'text_input', icon: MenuIcon, name: 'Text Input', blocks: ['heading', 'text_input'] as Block['type'][] },
  {
    id: 'multiple_choice',
    icon: ListLettersIcon,
    name: 'Multiple Choice',
    blocks: ['heading', 'multiple_choice'] as Block['type'][],
  },
  {
    id: 'picture_choice',
    icon: LayoutGridIcon,
    name: 'Picture Choice',
    blocks: ['heading', 'picture_choice'] as Block['type'][],
  },
  { id: 'dropdown', icon: ChevronDownIcon, name: 'Dropdown', blocks: ['heading', 'dropdown'] as Block['type'][] },
  { id: 'loader', icon: LoaderIcon, name: 'Loader', blocks: ['loader'] as Block['type'][] },
]

function createPage(templateId: string, pageCount: number): Page {
  const template = PAGE_TEMPLATES.find((t) => t.id === templateId)!
  const blocks = template.blocks.map((type) => createBlock(type))

  return {
    id: ulid(),
    name: `Page ${pageCount + 1}`,
    blocks,
    properties: { buttonText: 'Continue' },
  }
}

// =============================================================================
// AddPageMenu
// =============================================================================

interface AddPageMenuProps {
  children: React.ReactNode
  pageCount: number
  onPageAdd: (page: Page) => void
  onPageSelect: (pageId: string) => void
  onBlockSelect: (blockId: string | null) => void
}

function AddPageMenu({ children, pageCount, onPageAdd, onPageSelect, onBlockSelect }: AddPageMenuProps) {
  return (
    <Menu.Root>
      {children}
      <Menu.Content side="right" align="start">
        <Menu.Group>
          {PAGE_TEMPLATES.map((template) => (
            <Menu.Item
              key={template.id}
              onClick={() => {
                const page = createPage(template.id, pageCount)
                onPageAdd(page)
                onBlockSelect(null)
                onPageSelect(page.id)
              }}
            >
              <template.icon className="size-4 text-muted-foreground" />
              {template.name}
            </Menu.Item>
          ))}
        </Menu.Group>
      </Menu.Content>
    </Menu.Root>
  )
}

// =============================================================================
// AddBlockMenu
// =============================================================================

interface AddBlockMenuProps {
  children: React.ReactNode
  existingBlocks: Block[]
  onBlockAdd: (block: Block) => void
  onBlockSelect: (blockId: string | null) => void
  onPageSelect: (pageId: string | null) => void
}

function AddBlockMenu({ children, existingBlocks, onBlockAdd, onBlockSelect, onPageSelect }: AddBlockMenuProps) {
  const hasInputOrLoader = existingBlocks.some((block) =>
    ['text_input', 'multiple_choice', 'picture_choice', 'dropdown', 'loader'].includes(block.type),
  )

  const displayBlocks: Block['type'][] = ['heading', 'paragraph', 'gauge', 'list', 'image', 'html', 'spacer']
  const inputBlocks: Block['type'][] = ['text_input', 'multiple_choice', 'picture_choice', 'dropdown', 'loader']

  const availableBlocks: Block['type'][] = hasInputOrLoader ? displayBlocks : [...inputBlocks, ...displayBlocks]

  return (
    <Menu.Root>
      {children}
      <Menu.Content side="right" align="start">
        <Menu.Group>
          {availableBlocks.map((type) => {
            const blockInfo = getBlockInfo(type)
            return (
              <Menu.Item
                key={type}
                onClick={() => {
                  const block = createBlock(type)
                  onBlockAdd(block)
                  onPageSelect(null)
                  onBlockSelect(block.id)
                }}
              >
                <blockInfo.icon className="size-4 text-muted-foreground" />
                {blockInfo.name}
              </Menu.Item>
            )
          })}
        </Menu.Group>
      </Menu.Content>
    </Menu.Root>
  )
}

// =============================================================================
// PageItem
// =============================================================================

interface PageItemProps {
  page: Page
  index: number
  selected: boolean
  onSelect: () => void
}

function PageItem({ page, index, selected, onSelect }: PageItemProps) {
  const { ref } = useSortable({ id: page.id, index })

  return (
    <div
      ref={ref}
      className={cn(
        '-mx-1.5 flex h-8 cursor-default items-center gap-2 rounded-md pr-1 pl-2 transition-all hover:bg-muted',
        selected && 'bg-muted',
      )}
      onClick={onSelect}
    >
      <FileIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-xm">{page.name || `Page ${index + 1}`}</span>
    </div>
  )
}

// =============================================================================
// BlockItem
// =============================================================================

interface BlockItemProps {
  block: Block
  index: number
  selected: boolean
  onSelect: () => void
}

function BlockItem({ block, index, selected, onSelect }: BlockItemProps) {
  const blockInfo = getBlockInfo(block.type)
  const { ref } = useSortable({ id: block.id, index })

  return (
    <div
      ref={ref}
      className={cn(
        '-mx-1.5 flex h-8 cursor-default items-center gap-2 rounded-md pr-1 pl-2 transition-all hover:bg-muted',
        selected && 'bg-muted',
      )}
      onClick={onSelect}
    >
      <blockInfo.icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-xm">
        {'name' in block.properties && block.properties.name ? block.properties.name : blockInfo.name}
      </span>
    </div>
  )
}

// =============================================================================
// PagesPane
// =============================================================================

interface PagesPaneProps {
  pages: Page[]
  selectedPageId: string | null
  selectedBlockId: string | null
  onPageSelect: (pageId: string) => void
  onBlockSelect: (blockId: string | null) => void
  onPagesReorder: (pages: Page[]) => void
  onPageAdd: (page: Page) => void
}

function PagesPane({
  pages,
  selectedPageId,
  selectedBlockId,
  onPageSelect,
  onBlockSelect,
  onPagesReorder,
  onPageAdd,
}: PagesPaneProps) {
  return (
    <Pane.Root>
      <Pane.Header>
        <Pane.Title>Pages</Pane.Title>
        <AddPageMenu
          pageCount={pages.length}
          onPageAdd={onPageAdd}
          onPageSelect={onPageSelect}
          onBlockSelect={onBlockSelect}
        >
          <Menu.Trigger render={<Button className="-mr-2" size="icon" variant="ghost" />}>
            <PlusIcon />
          </Menu.Trigger>
        </AddPageMenu>
      </Pane.Header>
      <Pane.Content>
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-sm text-muted-foreground">No pages yet</span>
          </div>
        ) : (
          <DragDropProvider onDragEnd={(event) => onPagesReorder(move(pages, event))}>
            <div className="flex flex-col gap-0.5 py-2">
              {pages.map((page, index) => (
                <PageItem
                  key={page.id}
                  page={page}
                  index={index}
                  selected={selectedPageId === page.id}
                  onSelect={() => {
                    onBlockSelect(null)
                    onPageSelect(page.id)
                  }}
                />
              ))}
            </div>
          </DragDropProvider>
        )}
      </Pane.Content>
    </Pane.Root>
  )
}

// =============================================================================
// BlocksPane
// =============================================================================

interface BlocksPaneProps {
  pageId: string
  blocks: Block[]
  selectedBlockId: string | null
  onBlockSelect: (blockId: string | null) => void
  onPageSelect: (pageId: string | null) => void
  onBlocksReorder: (pageId: string, blocks: Block[]) => void
  onBlockAdd: (block: Block) => void
}

function BlocksPane({
  pageId,
  blocks,
  selectedBlockId,
  onBlockSelect,
  onPageSelect,
  onBlocksReorder,
  onBlockAdd,
}: BlocksPaneProps) {
  return (
    <Pane.Root>
      <Pane.Header>
        <Pane.Title>Blocks</Pane.Title>
        <AddBlockMenu
          existingBlocks={blocks}
          onBlockAdd={onBlockAdd}
          onBlockSelect={onBlockSelect}
          onPageSelect={onPageSelect}
        >
          <Menu.Trigger render={<Button className="-mr-2" size="icon" variant="ghost" />}>
            <PlusIcon />
          </Menu.Trigger>
        </AddBlockMenu>
      </Pane.Header>
      <Pane.Content>
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-xm text-muted-foreground">No blocks yet</span>
          </div>
        ) : (
          <DragDropProvider onDragEnd={(event) => onBlocksReorder(pageId, move(blocks, event))}>
            <div className="flex flex-col gap-0.5 py-2">
              {blocks.map((block, index) => (
                <BlockItem
                  key={block.id}
                  block={block}
                  index={index}
                  selected={selectedBlockId === block.id}
                  onSelect={() => {
                    onPageSelect(null)
                    onBlockSelect(block.id)
                  }}
                />
              ))}
            </div>
          </DragDropProvider>
        )}
      </Pane.Content>
    </Pane.Root>
  )
}

// =============================================================================
// PagesPanel
// =============================================================================

export function PagesPanel() {
  const { data: funnel, maybeSave } = useFunnel()
  const { selectedPageId, selectedBlockId, selectPage, selectBlock } = useFunnelEditor()
  const { pages } = funnel

  const selectedPage = pages.find((page) => page.id === selectedPageId)
  const pageForBlocks =
    selectedPage ||
    (selectedBlockId ? pages.find((page) => page.blocks.some((block) => block.id === selectedBlockId)) : null)

  const handlePagesReorder = (reorderedPages: Page[]) => {
    maybeSave({ pages: reorderedPages })
  }

  const handlePageAdd = (page: Page) => {
    maybeSave({ pages: [...pages, page] })
    selectPage(page.id, 'panel')
    selectBlock(page.blocks[0]?.id ?? null, 'panel')
  }

  const handleBlocksReorder = (pageId: string, reorderedBlocks: Block[]) => {
    const updatedPages = pages.map((page) => (page.id === pageId ? { ...page, blocks: reorderedBlocks } : page))
    maybeSave({ pages: updatedPages })
  }

  const handleBlockAdd = (block: Block) => {
    const pageId =
      selectedPageId ||
      (selectedBlockId ? pages.find((page) => page.blocks.some((b) => b.id === selectedBlockId))?.id : null)
    if (!pageId) return

    const updatedPages = pages.map((page) => {
      if (page.id !== pageId) return page
      return { ...page, blocks: [...page.blocks, block] }
    })
    maybeSave({ pages: updatedPages })
    selectBlock(block.id, 'panel')
  }

  const handlePageSelect = (pageId: string) => {
    selectPage(pageId, 'panel')
  }

  const handleBlockSelect = (blockId: string | null) => {
    selectBlock(blockId, 'panel')
  }

  return (
    <Panel className="w-64 shrink-0">
      <Resizable.PanelGroup direction="vertical">
        <Resizable.Panel defaultSize={pageForBlocks ? 40 : 100} minSize={20}>
          <PagesPane
            pages={pages}
            selectedPageId={selectedPageId}
            selectedBlockId={selectedBlockId}
            onPageSelect={handlePageSelect}
            onBlockSelect={handleBlockSelect}
            onPagesReorder={handlePagesReorder}
            onPageAdd={handlePageAdd}
          />
        </Resizable.Panel>
        {pageForBlocks && (
          <React.Fragment>
            <Resizable.Handle />
            <Resizable.Panel defaultSize={60} minSize={20}>
              <BlocksPane
                pageId={pageForBlocks.id}
                blocks={pageForBlocks.blocks}
                selectedBlockId={selectedBlockId}
                onBlockSelect={handleBlockSelect}
                onPageSelect={(pageId) => (pageId ? selectPage(pageId, 'panel') : selectPage(null, 'panel'))}
                onBlocksReorder={handleBlocksReorder}
                onBlockAdd={handleBlockAdd}
              />
            </Resizable.Panel>
          </React.Fragment>
        )}
      </Resizable.PanelGroup>
    </Panel>
  )
}
