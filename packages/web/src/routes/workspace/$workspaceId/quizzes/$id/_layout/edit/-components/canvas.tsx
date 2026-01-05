import { Block, getBlockInfo } from '@/components/block'
import { NextButton } from '@/components/next-button'
import { getThemeCssVars, shouldAutoAdvance } from '@/components/quiz'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { cn } from '@/lib/utils'
import {
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
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
  IconMaximize as MaximizeIcon,
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
import { AddBlockMenu } from './add-block-menu'
import { AddPageMenu } from './add-page-menu'

import '@xyflow/react/dist/style.css'

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

function BlockContent({
  block,
  index,
  dragging,
  selected,
}: {
  block: BlockType
  index: number
  dragging?: boolean
  selected?: boolean
}) {
  const blockInfo = getBlockInfo(block.type)

  return (
    <div
      className={cn(
        'relative w-full select-none',
        dragging && 'shadow-lg ring-2 ring-primary',
        selected && 'ring-2 ring-primary',
        !selected && !dragging && 'group-hover/block:ring-2 group-hover/block:ring-primary',
      )}
    >
      <div
        className={cn(
          'absolute bottom-full left-0 z-10 mb-1 text-xs font-medium text-primary',
          selected ? 'block' : 'hidden group-hover/block:block',
        )}
      >
        {blockInfo.name}
      </div>
      <Block block={block} index={index} static />
    </div>
  )
}

function SortableBlock({
  block,
  index,
  dropping,
  selected,
  onSelect,
  pageId,
  pageBlocks,
  onBlockAdd,
}: {
  block: BlockType
  index: number
  dropping: boolean
  selected: boolean
  onSelect: (blockId: string) => void
  pageId: string
  pageBlocks: BlockType[]
  onBlockAdd: (block: BlockType, pageId?: string, index?: number) => void
}) {
  const { zoom } = useViewport()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dragging,
  } = useSortable({
    id: block.id,
    data: { type: 'block' },
  })

  const style: React.CSSProperties = dragging
    ? { opacity: 0, pointerEvents: 'none' }
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

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(block.id)
    },
    [onSelect, block.id],
  )

  const handleAddBlockAbove = React.useCallback(
    (newBlock: BlockType) => {
      onBlockAdd(newBlock, pageId, index)
    },
    [onBlockAdd, pageId, index],
  )

  const handleAddBlockBelow = React.useCallback(
    (newBlock: BlockType) => {
      onBlockAdd(newBlock, pageId, index + 1)
    },
    [onBlockAdd, pageId, index],
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/block nopan nodrag relative"
      data-slot="canvas-block"
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      <div className="relative">
        <BlockContent block={block} index={index} selected={selected} />

        {/* Top add-block button - centered on top border of BlockContent */}
        <div className="pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 scale-0 opacity-0 transition-[opacity,transform] group-hover/block:pointer-events-auto group-hover/block:scale-100 group-hover/block:opacity-100 has-[[data-popup-open]]:pointer-events-auto has-[[data-popup-open]]:scale-100 has-[[data-popup-open]]:opacity-100">
          <AddBlockMenu.Root onBlockAdd={handleAddBlockAbove} existingBlocks={pageBlocks}>
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

        {/* Bottom add-block button - centered on bottom border of BlockContent */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 scale-0 opacity-0 transition-[opacity,transform] group-hover/block:pointer-events-auto group-hover/block:scale-100 group-hover/block:opacity-100 has-[[data-popup-open]]:pointer-events-auto has-[[data-popup-open]]:scale-100 has-[[data-popup-open]]:opacity-100">
          <AddBlockMenu.Root onBlockAdd={handleAddBlockBelow} existingBlocks={pageBlocks}>
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

function Page({
  page,
  pageIndex,
  dropping,
  overlay,
  draggingPage,
  selected,
  selectedBlockId,
  onSelectBlock,
  onBlockAdd,
}: {
  page: PageType
  pageIndex: number
  dropping: boolean
  overlay?: boolean
  draggingPage?: boolean
  selected?: boolean
  selectedBlockId?: string | null
  onSelectBlock?: (blockId: string) => void
  onBlockAdd?: (block: BlockType, pageId?: string, index?: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'text-sm font-medium',
          selected
            ? 'text-primary'
            : 'text-muted-foreground group-[:hover:not(:has([data-slot=canvas-block]:hover))]/page:text-primary',
        )}
      >
        {page.name || `Page ${pageIndex + 1}`}
      </div>
      <div
        className={cn(
          'relative border border-border',
          'group-hover/page:[&:not(:has([data-slot=canvas-block]:hover))]:border-primary group-hover/page:[&:not(:has([data-slot=canvas-block]:hover))]:ring group-hover/page:[&:not(:has([data-slot=canvas-block]:hover))]:ring-primary',
          selected && 'border-primary ring ring-primary',
        )}
      >
        <div
          className="no-scrollbar flex flex-col overflow-y-auto bg-white"
          style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
        >
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pt-8">
            {overlay || draggingPage ? (
              <div className="flex flex-col">
                {page.blocks.map((block, index) => (
                  <BlockContent key={block.id} block={block} index={index} />
                ))}
              </div>
            ) : (
              <SortableContext items={page.blocks} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col">
                  {page.blocks.map((block, index) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      index={index}
                      dropping={dropping}
                      selected={selectedBlockId === block.id}
                      onSelect={onSelectBlock!}
                      pageId={page.id}
                      pageBlocks={page.blocks}
                      onBlockAdd={onBlockAdd!}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
            {!shouldAutoAdvance(page.blocks) && (
              <div className="mt-auto w-full pt-4 pb-5">
                <NextButton static>{page.properties?.buttonText || 'Next'}</NextButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SortablePage({
  page,
  pageIndex,
  zoom,
  dropping,
  selected,
  onSelect,
  draggingPage,
  selectedBlockId,
  onSelectBlock,
  onBlockAdd,
  pageCount,
  onPageAdd,
}: {
  page: PageType
  pageIndex: number
  zoom: number
  dropping: boolean
  selected: boolean
  onSelect: (pageId: string) => void
  draggingPage: boolean
  selectedBlockId: string | null
  onSelectBlock: (blockId: string) => void
  onBlockAdd: (block: BlockType, pageId?: string, index?: number) => void
  pageCount: number
  onPageAdd: (page: PageType, index: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dragging,
  } = useSortable({
    id: page.id,
    data: { type: 'page' },
  })

  const style: React.CSSProperties = dragging
    ? { opacity: 0, pointerEvents: 'none' }
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

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(page.id)
    },
    [onSelect, page.id],
  )

  const handleAddPageLeft = React.useCallback(
    (newPage: PageType) => {
      onPageAdd(newPage, pageIndex)
    },
    [onPageAdd, pageIndex],
  )

  const handleAddPageRight = React.useCallback(
    (newPage: PageType) => {
      onPageAdd(newPage, pageIndex + 1)
    },
    [onPageAdd, pageIndex],
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="nopan nodrag group/page relative"
      data-slot="canvas-page"
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      <Page
        page={page}
        pageIndex={pageIndex}
        dropping={dropping}
        draggingPage={draggingPage}
        selected={selected}
        selectedBlockId={selectedBlockId}
        onSelectBlock={onSelectBlock}
        onBlockAdd={onBlockAdd}
      />

      {/* Left add-page button - centered on left border */}
      <div className="pointer-events-none absolute top-1/2 left-0 z-10 -translate-x-1/2 -translate-y-1/2 scale-0 opacity-0 transition-[opacity,transform] group-[:hover:not(:has([data-slot=canvas-block]:hover))]/page:pointer-events-auto group-[:hover:not(:has([data-slot=canvas-block]:hover))]/page:scale-100 group-[:hover:not(:has([data-slot=canvas-block]:hover))]/page:opacity-100 has-[[data-popup-open]]:pointer-events-auto has-[[data-popup-open]]:scale-100 has-[[data-popup-open]]:opacity-100">
        <AddPageMenu.Root onPageAdd={handleAddPageLeft} pageCount={pageCount} side="left">
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

      {/* Right add-page button - centered on right border */}
      <div className="pointer-events-none absolute top-1/2 right-0 z-10 translate-x-1/2 -translate-y-1/2 scale-0 opacity-0 transition-[opacity,transform] group-[:hover:not(:has([data-slot=canvas-block]:hover))]/page:pointer-events-auto group-[:hover:not(:has([data-slot=canvas-block]:hover))]/page:scale-100 group-[:hover:not(:has([data-slot=canvas-block]:hover))]/page:opacity-100 has-[[data-popup-open]]:pointer-events-auto has-[[data-popup-open]]:scale-100 has-[[data-popup-open]]:opacity-100">
        <AddPageMenu.Root onPageAdd={handleAddPageRight} pageCount={pageCount} side="right">
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
  )
}

type NodeData = {
  pages: PageType[]
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
}

type NodeType = Node<NodeData, 'node'>

function Node({
  data: {
    pages,
    theme,
    draggingPage,
    draggingBlock,
    dropping,
    selectedPageId,
    selectedBlockId,
    onSelectPage,
    onSelectBlock,
    onDragStart,
    onDragEnd,
    onPageAdd,
    onBlockAdd,
  },
}: NodeProps<NodeType>) {
  const { zoom } = useViewport()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  return (
    <div className="nopan nodrag" style={getThemeCssVars(theme)}>
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={pages} strategy={horizontalListSortingStrategy}>
          <div className="flex items-start gap-6">
            {pages.map((page, i) => (
              <SortablePage
                key={page.id}
                page={page}
                pageIndex={i}
                zoom={zoom}
                dropping={dropping}
                selected={selectedPageId === page.id}
                onSelect={onSelectPage}
                draggingPage={draggingPage !== null}
                selectedBlockId={selectedBlockId}
                onSelectBlock={onSelectBlock}
                onBlockAdd={onBlockAdd}
                pageCount={pages.length}
                onPageAdd={onPageAdd}
              />
            ))}
          </div>
        </SortableContext>
        {createPortal(
          <DragOverlay dropAnimation={DROP_ANIMATION}>
            {(draggingPage || draggingBlock) && (
              <div style={getThemeCssVars(theme)}>
                {draggingPage ? (
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'fit-content' }}>
                    <Page
                      page={draggingPage}
                      pageIndex={pages.findIndex((p) => p.id === draggingPage.id)}
                      dropping={false}
                      overlay
                    />
                  </div>
                ) : draggingBlock ? (
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: PAGE_WIDTH - 48 }}>
                    <BlockContent block={draggingBlock} index={0} dragging />
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

const nodeTypes = {
  node: Node,
}

function CanvasContent({
  nodes,
  onPaneClick,
  onThemeButtonClick,
}: {
  nodes: NodeType[]
  onPaneClick: () => void
  onThemeButtonClick: () => void
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  return (
    <ReactFlow
      nodes={nodes}
      nodeTypes={nodeTypes}
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

  const nodes = React.useMemo<NodeType[]>(
    () => [
      {
        id: 'node',
        type: 'node',
        position: { x: 0, y: 0 },
        data: {
          pages,
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
        },
      },
    ],
    [
      pages,
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
    ],
  )

  return (
    <div className="size-full overscroll-x-none bg-background" data-slot="canvas">
      <ReactFlowProvider>
        <CanvasContent nodes={nodes} onPaneClick={handlePaneClick} onThemeButtonClick={onThemeButtonClick} />
      </ReactFlowProvider>
    </div>
  )
}
