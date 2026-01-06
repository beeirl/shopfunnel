import { Block as BlockComponent, getBlockInfo } from '@/components/block'
import { NextButton } from '@/components/next-button'
import { getThemeCssVars, shouldAutoAdvance } from '@/components/quiz'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Empty } from '@/components/ui/empty'
import { Menu } from '@/components/ui/menu'
import { cn } from '@/lib/utils'
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Block as BlockType, Page as PageType, Theme } from '@shopfunnel/core/quiz/types'
import {
  IconChevronDown as ChevronDownIcon,
  IconFile as FileIcon,
  IconLayoutGrid as LayoutGridIcon,
  IconListLetters as ListLettersIcon,
  IconLoader as LoaderIcon,
  IconMaximize as MaximizeIcon,
  IconMenu as MenuIcon,
  IconPalette as PaletteIcon,
  IconPlus as PlusIcon,
  IconZoomIn as ZoomInIcon,
  IconZoomOut as ZoomOutIcon,
} from '@tabler/icons-react'
import {
  Background,
  PanOnScrollMode,
  ReactFlow,
  Panel as ReactFlowPanel,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { ulid } from 'ulid'

import '@xyflow/react/dist/style.css'

// =============================================================================
// Constants
// =============================================================================

const PAGE_WIDTH = 393
const PAGE_HEIGHT = 852
const ZOOM_MIN = 0.25
const ZOOM_MAX = 2

const DROP_ANIMATION: DropAnimation = {
  duration: 200,
  easing: 'ease',
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: '0' },
    },
  }),
}

const BLOCKS: Record<BlockType['type'], () => BlockType> = {
  text_input: () => ({
    id: ulid(),
    type: 'text_input',
    properties: {
      name: 'Text Input',
      placeholder: '',
    },
    validations: {
      required: false,
    },
  }),
  multiple_choice: () => ({
    id: ulid(),
    type: 'multiple_choice',
    properties: {
      name: 'Multiple Choice',
      options: [{ id: ulid(), label: 'Choice 1' }],
    },
    validations: {
      required: false,
    },
  }),
  picture_choice: () => ({
    id: ulid(),
    type: 'picture_choice',
    properties: {
      name: 'Picture Choice',
      options: [
        { id: ulid(), label: 'Choice 1' },
        { id: ulid(), label: 'Choice 2' },
      ],
    },
    validations: {
      required: false,
    },
  }),
  dropdown: () => ({
    id: ulid(),
    type: 'dropdown',
    properties: {
      name: 'Dropdown',
      options: [{ id: ulid(), label: 'Option 1' }],
    },
    validations: {
      required: false,
    },
  }),
  heading: () => ({
    id: ulid(),
    type: 'heading',
    properties: {
      text: 'Heading',
      alignment: 'left',
    },
  }),
  paragraph: () => ({
    id: ulid(),
    type: 'paragraph',
    properties: {
      text: 'Paragraph',
      alignment: 'left',
    },
  }),
  gauge: () => ({
    id: ulid(),
    type: 'gauge',
    properties: {
      value: 50,
      minValue: 0,
      maxValue: 100,
    },
  }),
  list: () => ({
    id: ulid(),
    type: 'list',
    properties: {
      orientation: 'vertical',
      textPlacement: 'right',
      size: 'sm',
      items: [{ id: ulid(), title: 'Item', media: { type: 'emoji', value: '✓' } }],
    },
  }),
  image: () => ({
    id: ulid(),
    type: 'image',
    properties: {},
  }),
  loader: () => ({
    id: ulid(),
    type: 'loader',
    properties: {
      duration: 3000,
    },
  }),
}

const PAGE_TEMPLATES = [
  { id: 'blank', icon: FileIcon, name: 'Blank', blocks: [] as string[] },
  { id: 'text_input', icon: MenuIcon, name: 'Text Input', blocks: ['heading', 'text_input'] },
  { id: 'multiple_choice', icon: ListLettersIcon, name: 'Multiple Choice', blocks: ['heading', 'multiple_choice'] },
  { id: 'picture_choice', icon: LayoutGridIcon, name: 'Picture Choice', blocks: ['heading', 'picture_choice'] },
  { id: 'dropdown', icon: ChevronDownIcon, name: 'Dropdown', blocks: ['heading', 'dropdown'] },
  { id: 'loader', icon: LoaderIcon, name: 'Loader', blocks: ['loader'] },
]

// =============================================================================
// Contexts
// =============================================================================

interface CanvasContextValue {
  theme: Theme
  draggingPage: PageType | null
  draggingBlock: BlockType | null
  dropping: boolean
  selectedPageId: string | null
  selectedBlockId: string | null
  onSelectPage: (pageId: string | null) => void
  onSelectBlock: (blockId: string | null) => void
  onDragStart: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onPageAdd: (page: PageType, index: number) => void
  onBlockAdd: (block: BlockType, pageId?: string, index?: number) => void
  onPaneClick: () => void
  onThemeButtonClick: () => void
}

const CanvasContext = React.createContext<CanvasContextValue | null>(null)

function useCanvas() {
  const context = React.use(CanvasContext)
  if (!context) {
    throw new Error('useCanvas must be used within Canvas')
  }
  return context
}

interface CanvasPageContextValue {
  page: PageType
  pageIndex: number
  pageCount: number
}

const CanvasPageContext = React.createContext<CanvasPageContextValue | null>(null)

function useCanvasPage() {
  return React.use(CanvasPageContext)
}

// =============================================================================
// AddBlockMenu
// =============================================================================

const AddBlockMenuContext = React.createContext<{
  onBlockAdd: (block: BlockType) => void
} | null>(null)

function useAddBlockMenuContext() {
  const context = React.use(AddBlockMenuContext)
  if (!context) {
    throw new Error('AddBlockMenu components must be used within AddBlockMenu.Root')
  }
  return context
}

function AddBlockMenuRoot({
  children,
  onBlockAdd,
  onOpenChange,
}: {
  children: React.ReactNode
  onBlockAdd: (block: BlockType) => void
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <AddBlockMenuContext value={{ onBlockAdd }}>
      <Menu.Root onOpenChange={onOpenChange}>{children}</Menu.Root>
    </AddBlockMenuContext>
  )
}

function AddBlockMenuContent() {
  const { onBlockAdd } = useAddBlockMenuContext()
  const canvasPageContext = useCanvasPage()
  const existingBlocks = canvasPageContext?.page.blocks ?? []

  const hasInputOrLoader = existingBlocks.some((block) =>
    ['text_input', 'multiple_choice', 'picture_choice', 'dropdown', 'loader'].includes(block.type),
  )

  const availableBlockTypes: BlockType['type'][] = hasInputOrLoader
    ? ['heading', 'paragraph', 'gauge', 'list', 'image']
    : ['text_input', 'multiple_choice', 'picture_choice', 'dropdown', 'loader']

  const handleBlockAdd = (type: BlockType['type']) => {
    onBlockAdd(BLOCKS[type]())
  }

  return (
    <Menu.Content side="bottom" align="center">
      <Menu.Group>
        <Menu.Label>Blocks</Menu.Label>
        {availableBlockTypes.map((type) => {
          const blockInfo = getBlockInfo(type)
          return (
            <Menu.Item key={type} onClick={() => handleBlockAdd(type)}>
              <blockInfo.icon className="size-4 text-muted-foreground" />
              {blockInfo.name}
            </Menu.Item>
          )
        })}
      </Menu.Group>
    </Menu.Content>
  )
}

const AddBlockMenu = {
  Root: AddBlockMenuRoot,
  Trigger: Menu.Trigger,
  Content: AddBlockMenuContent,
}

// =============================================================================
// AddPageMenu
// =============================================================================

const AddPageMenuContext = React.createContext<{
  onPageAdd: (page: PageType) => void
  side: 'left' | 'right'
} | null>(null)

function useAddPageMenuContext() {
  const context = React.use(AddPageMenuContext)
  if (!context) {
    throw new Error('AddPageMenu components must be used within AddPageMenu.Root')
  }
  return context
}

function AddPageMenuRoot({
  children,
  onPageAdd,
  side,
  onOpenChange,
}: {
  children: React.ReactNode
  onPageAdd: (page: PageType) => void
  side: 'left' | 'right'
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <AddPageMenuContext value={{ onPageAdd, side }}>
      <Menu.Root onOpenChange={onOpenChange}>{children}</Menu.Root>
    </AddPageMenuContext>
  )
}

function AddPageMenuContent() {
  const { onPageAdd, side } = useAddPageMenuContext()
  const canvasPageContext = useCanvasPage()
  const pageCount = canvasPageContext?.pageCount ?? 0

  const handlePageAdd = (templateId: string) => {
    const template = PAGE_TEMPLATES.find((t) => t.id === templateId)!
    const blocks: BlockType[] = template.blocks.map((type) => BLOCKS[type]())
    const page: PageType = {
      id: ulid(),
      name: `Page ${pageCount + 1}`,
      blocks,
      properties: { buttonText: 'Continue' },
    }
    onPageAdd(page)
  }

  return (
    <Menu.Content side={side} align="center">
      <Menu.Group>
        <Menu.Label>Pages</Menu.Label>
        {PAGE_TEMPLATES.map((template) => (
          <Menu.Item key={template.id} onClick={() => handlePageAdd(template.id)}>
            <template.icon className="size-4 text-muted-foreground" />
            {template.name}
          </Menu.Item>
        ))}
      </Menu.Group>
    </Menu.Content>
  )
}

const AddPageMenu = {
  Root: AddPageMenuRoot,
  Trigger: Menu.Trigger,
  Content: AddPageMenuContent,
}

// =============================================================================
// CanvasBlock
// =============================================================================

function CanvasBlock({
  block,
  index,
  static: isStatic,
  dragging,
}: {
  block: BlockType
  index: number
  static?: boolean
  dragging?: boolean
}) {
  const { dropping, selectedBlockId, onSelectBlock, onBlockAdd } = useCanvas()
  const canvasPageContext = useCanvasPage()
  const { zoom } = useViewport()

  const [addMenuOpen, setAddMenuOpen] = React.useState(false)

  const blockInfo = getBlockInfo(block.type)
  const selected = selectedBlockId === block.id

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { type: 'block' },
    disabled: isStatic,
  })

  const style: React.CSSProperties = isDragging
    ? { opacity: 0, pointerEvents: 'none' }
    : isStatic
      ? {}
      : {
          transform: dropping
            ? undefined
            : CSS.Transform.toString(
                transform
                  ? {
                      ...transform,
                      x: transform.x / zoom,
                      y: transform.y / zoom,
                    }
                  : null,
              ),
          transition: dropping ? 'none' : transition,
          pointerEvents: 'all',
          touchAction: 'none',
        }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectBlock(block.id)
  }

  const handleAddMenuOpenChange = (open: boolean) => {
    setAddMenuOpen(open)
    if (open) {
      onSelectBlock(null)
    }
  }

  if (isStatic) {
    return (
      <div className={cn('relative w-full select-none', dragging && 'shadow-lg ring-2 ring-primary')}>
        <div
          className={cn(
            'absolute bottom-full left-0 z-10 mb-1 text-xs font-medium text-primary',
            selected || addMenuOpen ? 'block' : 'hidden group-hover/canvas-block:block',
          )}
        >
          {'name' in block.properties && block.properties.name ? block.properties.name : blockInfo.name}
        </div>
        <BlockComponent block={block} index={index} static />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/canvas-block nopan nodrag relative"
      data-slot="canvas-block"
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <div
        className={cn(
          'relative ring-primary',
          (selected || addMenuOpen) && 'ring-2',
          !selected && !addMenuOpen && 'group-hover/canvas-block:ring-2',
        )}
      >
        <div className="relative w-full select-none">
          <div
            className={cn(
              'absolute bottom-full left-0 z-10 mb-1 text-xs font-medium text-primary',
              selected || addMenuOpen ? 'block' : 'hidden group-hover/canvas-block:block',
            )}
          >
            {'name' in block.properties && block.properties.name ? block.properties.name : blockInfo.name}
          </div>
          <BlockComponent block={block} index={index} static />
        </div>
        <div
          className="pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 scale-0 opacity-0 transition-[opacity,transform] group-hover/canvas-block:pointer-events-auto group-hover/canvas-block:scale-100 group-hover/canvas-block:opacity-100 has-data-popup-open:pointer-events-auto has-data-popup-open:scale-100 has-data-popup-open:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <AddBlockMenu.Root
            onBlockAdd={(block) => onBlockAdd(block, canvasPageContext!.page.id, index)}
            onOpenChange={handleAddMenuOpenChange}
          >
            <AddBlockMenu.Trigger
              render={
                <Button className="cursor-crosshair" size="icon-sm">
                  <PlusIcon />
                </Button>
              }
            />
            <AddBlockMenu.Content />
          </AddBlockMenu.Root>
        </div>
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 scale-0 opacity-0 transition-[opacity,transform] group-hover/canvas-block:pointer-events-auto group-hover/canvas-block:scale-100 group-hover/canvas-block:opacity-100 has-data-popup-open:pointer-events-auto has-data-popup-open:scale-100 has-data-popup-open:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <AddBlockMenu.Root
            onBlockAdd={(block) => onBlockAdd(block, canvasPageContext!.page.id, index + 1)}
            onOpenChange={handleAddMenuOpenChange}
          >
            <AddBlockMenu.Trigger
              render={
                <Button className="cursor-crosshair" size="icon-sm">
                  <PlusIcon />
                </Button>
              }
            />
            <AddBlockMenu.Content />
          </AddBlockMenu.Root>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// CanvasPage
// =============================================================================

function CanvasPage({
  page,
  pageIndex,
  pageCount,
  static: isStatic,
}: {
  page: PageType
  pageIndex: number
  pageCount: number
  static?: boolean
}) {
  const { draggingPage, dropping, selectedPageId, onSelectPage, onSelectBlock, onBlockAdd, onPageAdd } = useCanvas()
  const { zoom } = useViewport()
  const [addMenuOpen, setAddMenuOpen] = React.useState(false)

  const pageContextValue = React.useMemo<CanvasPageContextValue>(
    () => ({ page, pageIndex, pageCount }),
    [page, pageIndex, pageCount],
  )

  const selected = selectedPageId === page.id

  const handleAddMenuOpenChange = (open: boolean) => {
    setAddMenuOpen(open)
    if (open) {
      onSelectPage(null)
      onSelectBlock(null)
    }
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
    data: { type: 'page' },
    disabled: isStatic,
  })

  const style: React.CSSProperties = isDragging
    ? { opacity: 0, pointerEvents: 'none' }
    : isStatic
      ? {}
      : {
          transform: dropping
            ? undefined
            : CSS.Transform.toString(
                transform
                  ? {
                      ...transform,
                      x: transform.x / zoom,
                      y: transform.y / zoom,
                    }
                  : null,
              ),
          transition: dropping ? 'none' : transition,
          pointerEvents: 'all',
          touchAction: 'none',
        }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectPage(page.id)
  }

  const blocksStatic = isStatic || draggingPage !== null

  const pageContent = (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'text-sm font-medium',
          isStatic
            ? 'text-muted-foreground'
            : selected || addMenuOpen
              ? 'text-primary'
              : 'text-muted-foreground group-[:hover:not(:has([data-slot=canvas-block]:hover))]/canvas-page:text-primary',
        )}
      >
        {page.name || `Page ${pageIndex + 1}`}
      </div>
      <div
        className={cn(
          'relative border border-border ring-primary',
          !isStatic &&
            'group-[:hover:not(:has([data-slot=canvas-block]:hover))]/canvas-page:border-primary group-[:hover:not(:has([data-slot=canvas-block]:hover))]/canvas-page:ring',
          !isStatic && (selected || addMenuOpen) && 'border-primary ring',
        )}
      >
        <div
          className="no-scrollbar flex flex-col overflow-y-auto bg-(--qz-background)"
          style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
        >
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pt-8">
            {page.blocks.length === 0 ? (
              <Empty.Root>
                <Empty.Header>
                  <Empty.Title>No blocks yet</Empty.Title>
                  <Empty.Description>Add a block to get started</Empty.Description>
                </Empty.Header>
                <Empty.Content>
                  <AddBlockMenu.Root onBlockAdd={(block) => onBlockAdd(block, page.id)}>
                    <AddBlockMenu.Trigger
                      render={
                        <Button>
                          <PlusIcon />
                          Add Block
                        </Button>
                      }
                    />
                    <AddBlockMenu.Content />
                  </AddBlockMenu.Root>
                </Empty.Content>
              </Empty.Root>
            ) : (
              <>
                {blocksStatic ? (
                  <div className="flex flex-col">
                    {page.blocks.map((block, index) => (
                      <CanvasBlock key={block.id} block={block} index={index} static />
                    ))}
                  </div>
                ) : (
                  <SortableContext items={page.blocks} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col">
                      {page.blocks.map((block, index) => (
                        <CanvasBlock key={block.id} block={block} index={index} />
                      ))}
                    </div>
                  </SortableContext>
                )}
                {!shouldAutoAdvance(page.blocks) && (
                  <div className="mt-auto w-full pt-4 pb-5">
                    <NextButton static>{page.properties?.buttonText || 'Next'}</NextButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (isStatic) {
    return <CanvasPageContext.Provider value={pageContextValue}>{pageContent}</CanvasPageContext.Provider>
  }

  return (
    <CanvasPageContext.Provider value={pageContextValue}>
      <div
        ref={setNodeRef}
        style={style}
        className="group/canvas-page nopan nodrag relative"
        data-slot="canvas-page"
        {...attributes}
        {...listeners}
        onClick={handleClick}
      >
        {pageContent}
        <div
          className="pointer-events-none absolute top-1/2 left-0 z-10 -translate-x-1/2 -translate-y-1/2 scale-0 opacity-0 transition-[opacity,transform] group-[:hover:not(:has([data-slot=canvas-block]:hover))]/canvas-page:pointer-events-auto group-[:hover:not(:has([data-slot=canvas-block]:hover))]/canvas-page:scale-100 group-[:hover:not(:has([data-slot=canvas-block]:hover))]/canvas-page:opacity-100 has-data-popup-open:pointer-events-auto has-data-popup-open:scale-100 has-data-popup-open:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <AddPageMenu.Root
            onPageAdd={(page) => onPageAdd(page, pageIndex)}
            side="left"
            onOpenChange={handleAddMenuOpenChange}
          >
            <AddPageMenu.Trigger
              render={
                <Button className="cursor-crosshair" size="icon">
                  <PlusIcon />
                </Button>
              }
            />
            <AddPageMenu.Content />
          </AddPageMenu.Root>
        </div>
        <div
          className="pointer-events-none absolute top-1/2 right-0 z-10 translate-x-1/2 -translate-y-1/2 scale-0 opacity-0 transition-[opacity,transform] group-[:hover:not(:has([data-slot=canvas-block]:hover))]/canvas-page:pointer-events-auto group-[:hover:not(:has([data-slot=canvas-block]:hover))]/canvas-page:scale-100 group-[:hover:not(:has([data-slot=canvas-block]:hover))]/canvas-page:opacity-100 has-data-popup-open:pointer-events-auto has-data-popup-open:scale-100 has-data-popup-open:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <AddPageMenu.Root
            onPageAdd={(page) => onPageAdd(page, pageIndex + 1)}
            side="right"
            onOpenChange={handleAddMenuOpenChange}
          >
            <AddPageMenu.Trigger
              render={
                <Button className="cursor-crosshair" size="icon">
                  <PlusIcon />
                </Button>
              }
            />
            <AddPageMenu.Content />
          </AddPageMenu.Root>
        </div>
      </div>
    </CanvasPageContext.Provider>
  )
}

// =============================================================================
// Canvas Components
// =============================================================================

type CanvasNodeData = {
  pages: PageType[]
}

type CanvasNode = Node<CanvasNodeData, 'canvasNode'>

function CanvasNodeComponent({ data: { pages } }: NodeProps<CanvasNode>) {
  const context = React.use(CanvasContext)
  if (!context) throw new Error('CanvasNode must be used within Canvas')

  const { theme, draggingPage, draggingBlock, onDragStart, onDragEnd } = context
  const { zoom } = useViewport()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  return (
    <div className="nopan nodrag" style={getThemeCssVars(theme)}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={pages} strategy={horizontalListSortingStrategy}>
          <div className="flex items-start gap-6">
            {pages.map((page, i) => (
              <CanvasPage key={page.id} page={page} pageIndex={i} pageCount={pages.length} />
            ))}
          </div>
        </SortableContext>
        {createPortal(
          <DragOverlay dropAnimation={DROP_ANIMATION}>
            {(draggingPage || draggingBlock) && (
              <div style={getThemeCssVars(theme)}>
                {draggingPage ? (
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'fit-content' }}>
                    <CanvasPage
                      page={draggingPage}
                      pageIndex={pages.findIndex((p) => p.id === draggingPage.id)}
                      pageCount={pages.length}
                      static
                    />
                  </div>
                ) : draggingBlock ? (
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: PAGE_WIDTH - 48 }}>
                    <CanvasBlock block={draggingBlock} index={0} static dragging />
                  </div>
                ) : null}
              </div>
            )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </div>
  )
}

const canvasNodeTypes = {
  canvasNode: CanvasNodeComponent,
}

function CanvasInner({ nodes }: { nodes: CanvasNode[] }) {
  const context = React.use(CanvasContext)
  if (!context) throw new Error('CanvasInner must be used within Canvas')

  const { onPaneClick, onThemeButtonClick } = context
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  return (
    <ReactFlow
      nodes={nodes}
      nodeTypes={canvasNodeTypes}
      minZoom={ZOOM_MIN}
      maxZoom={ZOOM_MAX}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      panOnScrollSpeed={1}
      panOnScrollMode={PanOnScrollMode.Free}
      zoomOnScroll={false}
      zoomOnPinch
      zoomActivationKeyCode="Meta"
      panOnDrag={[0, 1, 2]}
      onPaneClick={onPaneClick}
      proOptions={{
        hideAttribution: true,
      }}
    >
      <Background />
      <ReactFlowPanel position="top-left">
        <ButtonGroup.Root orientation="horizontal">
          <Button variant="outline" size="icon" onClick={() => zoomIn()}>
            <ZoomInIcon />
          </Button>
          <Button variant="outline" size="icon" onClick={() => zoomOut()}>
            <ZoomOutIcon />
          </Button>
          <Button variant="outline" size="icon" onClick={() => fitView()}>
            <MaximizeIcon />
          </Button>
        </ButtonGroup.Root>
      </ReactFlowPanel>
      <ReactFlowPanel position="top-right">
        <Button variant="outline" onClick={onThemeButtonClick}>
          <PaletteIcon />
          Design
        </Button>
      </ReactFlowPanel>
    </ReactFlow>
  )
}

// =============================================================================
// Canvas
// =============================================================================

export interface CanvasProps {
  pages: PageType[]
  theme: Theme
  selectedPageId: string | null
  selectedBlockId: string | null
  onPageSelect: (pageId: string | null) => void
  onBlockSelect: (blockId: string | null) => void
  onThemeButtonClick: () => void
  onPagesReorder: (pages: PageType[]) => void
  onPageAdd: (page: PageType, index: number) => void
  onPageDelete: (pageId: string) => void
  onBlocksReorder: (pageId: string, blocks: BlockType[]) => void
  onBlockAdd: (block: BlockType, pageId?: string, index?: number) => void
  onBlockDelete: (blockId: string) => void
}

export function Canvas({
  pages,
  theme,
  selectedPageId,
  selectedBlockId,
  onPageSelect,
  onBlockSelect,
  onThemeButtonClick,
  onPagesReorder,
  onPageAdd,
  onPageDelete,
  onBlocksReorder,
  onBlockAdd,
  onBlockDelete,
}: CanvasProps) {
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dropping, setDropping] = React.useState(false)

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setDropping(false)
    setDraggingId(String(event.active.id))
  }, [])

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setDropping(true)

      if (over && active.id !== over.id) {
        const activeId = String(active.id)
        const overId = String(over.id)
        const type = active.data.current?.type

        if (type === 'block') {
          // Block reordering within the same page
          const page = pages.find((p) => p.blocks.some((b) => b.id === activeId))
          if (page) {
            const blocks = page.blocks
            const oldIndex = blocks.findIndex((b) => b.id === activeId)
            const newIndex = blocks.findIndex((b) => b.id === overId)

            if (oldIndex !== -1 && newIndex !== -1) {
              onBlocksReorder(page.id, arrayMove(blocks, oldIndex, newIndex))
            }
          }
        } else {
          // Page reordering
          const oldIndex = pages.findIndex((p) => p.id === activeId)
          const newIndex = pages.findIndex((p) => p.id === overId)
          if (oldIndex !== -1 && newIndex !== -1) {
            onPagesReorder(arrayMove(pages, oldIndex, newIndex))
          }
        }
      }

      setDraggingId(null)
      requestAnimationFrame(() => setDropping(false))
    },
    [pages, onBlocksReorder, onPagesReorder],
  )

  const draggingPage = pages.find((p) => p.id === draggingId) ?? null
  const draggingBlock = !draggingPage ? (pages.flatMap((p) => p.blocks).find((b) => b.id === draggingId) ?? null) : null

  const handleSelectPage = React.useCallback(
    (pageId: string | null) => {
      onPageSelect(pageId)
      onBlockSelect(null)
    },
    [onPageSelect, onBlockSelect],
  )

  const handleSelectBlock = React.useCallback(
    (blockId: string | null) => {
      onBlockSelect(blockId)
      onPageSelect(null)
    },
    [onBlockSelect, onPageSelect],
  )

  const handlePaneClick = React.useCallback(() => {
    onPageSelect(null)
    onBlockSelect(null)
  }, [onPageSelect, onBlockSelect])

  // Keyboard handler for deleting selected block
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if we're in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if ((event.key === 'Backspace' || event.key === 'Delete') && selectedBlockId) {
        event.preventDefault()
        onBlockDelete(selectedBlockId)
      }

      if ((event.key === 'Backspace' || event.key === 'Delete') && selectedPageId && !selectedBlockId) {
        event.preventDefault()
        onPageDelete(selectedPageId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBlockId, selectedPageId, onBlockDelete, onPageDelete])

  const nodes = React.useMemo<CanvasNode[]>(
    () => [
      {
        id: 'canvasNode',
        type: 'canvasNode',
        position: { x: 0, y: 0 },
        data: { pages },
      },
    ],
    [pages],
  )

  const contextValue = React.useMemo<CanvasContextValue>(
    () => ({
      theme,
      draggingPage,
      draggingBlock,
      dropping,
      selectedPageId,
      selectedBlockId,
      onSelectPage: handleSelectPage,
      onSelectBlock: handleSelectBlock,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onPageAdd,
      onBlockAdd,
      onPaneClick: handlePaneClick,
      onThemeButtonClick,
    }),
    [
      theme,
      draggingPage,
      draggingBlock,
      dropping,
      selectedPageId,
      selectedBlockId,
      handleSelectPage,
      handleSelectBlock,
      handleDragStart,
      handleDragEnd,
      onPageAdd,
      onBlockAdd,
      handlePaneClick,
      onThemeButtonClick,
    ],
  )

  return (
    <div className="size-full overscroll-x-none bg-background" data-slot="canvas">
      <CanvasContext.Provider value={contextValue}>
        <ReactFlowProvider>
          <CanvasInner nodes={nodes} />
        </ReactFlowProvider>
      </CanvasContext.Provider>
    </div>
  )
}
