import { Block, getBlockInfo } from '@/components/block'
import { NextButton } from '@/components/next-button'
import { getThemeCssVars, shouldAutoAdvance } from '@/components/quiz'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Empty } from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import * as dagre from '@dagrejs/dagre'
import type { Block as BlockType, Page as PageType, Rule, Theme } from '@shopfunnel/core/quiz/types'
import {
  IconArrowsSplit2 as BranchIcon,
  IconMaximize as MaximizeIcon,
  IconPalette as PaletteIcon,
  IconZoomIn as ZoomInIcon,
  IconZoomOut as ZoomOutIcon,
} from '@tabler/icons-react'
import {
  Background,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  Panel as ReactFlowPanel,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import * as React from 'react'

import '@xyflow/react/dist/style.css'

// =============================================================================
// Constants
// =============================================================================

const PAGE_WIDTH = 393
const PAGE_HEIGHT = 852
const COLUMN_GAP = 100
const ROW_GAP = 100
const ZOOM_MIN = 0.1
const ZOOM_MAX = 1.5

// =============================================================================
// SelectableBlock
// =============================================================================

interface SelectableBlockProps {
  block: BlockType
  index: number
  selected: boolean
  onSelect: () => void
}

function SelectableBlock({ block, index, selected, onSelect }: SelectableBlockProps) {
  const blockInfo = getBlockInfo(block.type)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
  }

  return (
    <div className="group/block relative" data-slot="block" onClick={handleClick}>
      <div className={cn('relative ring-primary', selected && 'ring-2', !selected && 'group-hover/block:ring-2')}>
        {/* Block label */}
        <div
          className={cn(
            'absolute bottom-full left-0 z-10 mb-1 text-xs font-medium text-primary',
            selected ? 'block' : 'hidden group-hover/block:block',
          )}
        >
          {'name' in block.properties && block.properties.name ? block.properties.name : blockInfo.name}
        </div>

        {/* Block content */}
        <div className="relative w-full select-none">
          <Block block={block} index={index} static />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// PageNode
// =============================================================================

interface PageNodeData extends Record<string, unknown> {
  page: PageType
  theme: Theme
  pageIndex: number
  selected: boolean
  selectedBlockId: string | null
  hasRules: boolean
  isStart: boolean
  isEnd: boolean
  onPageSelect: (pageId: string) => void
  onBlockSelect: (blockId: string) => void
  onLogicClick: () => void
}

function PageNode({ data }: { data: PageNodeData }) {
  const { page, theme, pageIndex, selected, selectedBlockId, hasRules, isStart, isEnd, onBlockSelect, onLogicClick } =
    data

  const handleBlockSelect = (blockId: string) => {
    onBlockSelect(blockId)
  }

  const handleLogicClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLogicClick()
  }

  return (
    <div className="group/page-node nopan nodrag flex flex-col focus-visible:outline-none">
      {/* Page label */}
      <div
        className={cn(
          'mb-2 text-sm font-medium',
          selected
            ? 'text-primary'
            : 'text-muted-foreground group-[:hover:not(:has([data-slot=block]:hover,[data-slot=logic-button]:hover))]/page-node:text-primary',
        )}
      >
        {page.name || `Page ${pageIndex + 1}`}
      </div>

      {/* Page content container */}
      <div
        className={cn(
          'nopan nodrag relative border border-border bg-background ring-primary',
          'group-[:hover:not(:has([data-slot=block]:hover,[data-slot=logic-button]:hover))]/page-node:border-primary',
          'group-[:hover:not(:has([data-slot=block]:hover,[data-slot=logic-button]:hover))]/page-node:ring',
          selected && 'border-primary ring',
        )}
        style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
      >
        {/* Scrollable content area */}
        <div className="nowheel flex h-full flex-col overflow-y-auto" style={getThemeCssVars(theme)}>
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pt-8">
            {page.blocks.length === 0 ? (
              <Empty.Root>
                <Empty.Header>
                  <Empty.Title>No blocks yet</Empty.Title>
                  <Empty.Description>Add a block from the left panel</Empty.Description>
                </Empty.Header>
              </Empty.Root>
            ) : (
              <div className="flex flex-col">
                {page.blocks.map((block, index) => (
                  <SelectableBlock
                    key={block.id}
                    block={block}
                    index={index}
                    selected={selectedBlockId === block.id}
                    onSelect={() => handleBlockSelect(block.id)}
                  />
                ))}
              </div>
            )}

            {/* Next button */}
            {page.blocks.length > 0 && !shouldAutoAdvance(page.blocks) && (
              <div className="sticky bottom-0 mt-auto w-full pt-4 pb-5">
                <NextButton static>{page.properties?.buttonText || 'Next'}</NextButton>
              </div>
            )}
          </div>
        </div>

        {/* Logic button */}
        {!isEnd && (
          <Button
            variant={hasRules ? 'default' : 'outline'}
            size="icon"
            data-slot="logic-button"
            onClick={handleLogicClick}
            className="nopan nodrag absolute top-1/2 right-0 z-10 translate-x-1/2 -translate-y-1/2 rounded-full"
          >
            <BranchIcon />
          </Button>
        )}

        {/* Handles for flow edges */}
        {!isStart && <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-border" />}
        {!isEnd && <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-border" />}
      </div>
    </div>
  )
}

// =============================================================================
// Node Types
// =============================================================================

const nodeTypes = {
  page: PageNode,
}

// =============================================================================
// Layout
// =============================================================================

function getLayoutedElements(
  nodes: Node<PageNodeData>[],
  edges: Edge[],
): { nodes: Node<PageNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

  g.setGraph({
    rankdir: 'LR',
    nodesep: ROW_GAP,
    ranksep: COLUMN_GAP,
    ranker: 'longest-path',
  })

  const labelHeight = 28
  nodes.forEach((node) => {
    g.setNode(node.id, { width: PAGE_WIDTH, height: PAGE_HEIGHT + labelHeight })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - PAGE_WIDTH / 2,
        y: nodeWithPosition.y - (PAGE_HEIGHT + labelHeight) / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

function createEdges(pages: PageType[], rules: Rule[]): Edge[] {
  const edgeSet = new Set<string>()
  const edges: Edge[] = []

  const pagesWithJumpRules = new Set<string>()
  rules.forEach((rule) => {
    const hasJumpAction = rule.actions.some((action) => action.type === 'jump' && action.details.to?.value)
    if (hasJumpAction) {
      pagesWithJumpRules.add(rule.pageId)
    }
  })

  for (let i = 0; i < pages.length - 1; i++) {
    const sourcePage = pages[i]
    const targetPage = pages[i + 1]
    if (!sourcePage || !targetPage) continue

    const hasJumpRules = pagesWithJumpRules.has(sourcePage.id)
    const hasRedirect = !!sourcePage.properties?.redirectUrl

    if (hasJumpRules || hasRedirect) continue

    const sourceId = sourcePage.id
    const targetId = targetPage.id
    const edgeId = `seq-${sourceId}-${targetId}`

    if (!edgeSet.has(edgeId)) {
      edgeSet.add(edgeId)
      edges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        markerEnd: { type: MarkerType.Arrow, width: 24, height: 24 },
      })
    }
  }

  rules.forEach((rule) => {
    rule.actions.forEach((action) => {
      if (action.type === 'jump' && action.details.to?.value) {
        const sourceId = rule.pageId
        const targetId = action.details.to.value
        const edgeId = `jump-${sourceId}-${targetId}`

        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId)
          edges.push({
            id: edgeId,
            source: sourceId,
            target: targetId,
            markerEnd: { type: MarkerType.Arrow, width: 24, height: 24 },
          })
        }
      }
    })
  })

  return edges
}

// =============================================================================
// CanvasInner
// =============================================================================

interface CanvasInnerProps {
  nodes: Node<PageNodeData>[]
  edges: Edge[]
  pages: PageType[]
  selectedPageId: string | null
  selectedBlockId: string | null
  selectionSource: 'panel' | 'canvas' | null
  onPaneClick: () => void
  onNodeClick: (event: React.MouseEvent, node: Node<PageNodeData>) => void
  onThemeButtonClick: () => void
}

function CanvasInner({
  nodes,
  edges,
  pages,
  selectedPageId,
  selectedBlockId,
  selectionSource,
  onPaneClick,
  onNodeClick,
  onThemeButtonClick,
}: CanvasInnerProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  // Derive the page ID to focus on
  const focusPageId =
    selectedPageId ||
    (selectedBlockId ? pages.find((page) => page.blocks.some((block) => block.id === selectedBlockId))?.id : null)

  // Focus viewport on selected page (only from panel selection)
  React.useEffect(() => {
    if (selectionSource === 'panel' && focusPageId) {
      fitView({ nodes: [{ id: focusPageId }], maxZoom: 1 })
    }
  }, [selectedPageId, selectedBlockId, selectionSource, fitView, focusPageId])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      minZoom={ZOOM_MIN}
      maxZoom={ZOOM_MAX}
      fitView
      zoomOnPinch
      panOnScroll
      zoomOnScroll={false}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={[0, 1, 2]}
      onPaneClick={onPaneClick}
      onNodeClick={onNodeClick}
      proOptions={{ hideAttribution: true }}
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
  rules: Rule[]
  theme: Theme
  selectedPageId: string | null
  selectedBlockId: string | null
  selectionSource: 'panel' | 'canvas' | null
  onPageSelect: (pageId: string | null) => void
  onBlockSelect: (blockId: string | null) => void
  onThemeButtonClick: () => void
  onLogicClick: (pageId: string) => void
}

export function Canvas({
  pages,
  rules,
  theme,
  selectedPageId,
  selectedBlockId,
  selectionSource,
  onPageSelect,
  onBlockSelect,
  onThemeButtonClick,
  onLogicClick,
}: CanvasProps) {
  const handlePaneClick = React.useCallback(() => {
    onPageSelect(null)
    onBlockSelect(null)
  }, [onPageSelect, onBlockSelect])

  const handlePageSelect = React.useCallback(
    (pageId: string) => {
      onPageSelect(pageId)
      onBlockSelect(null)
    },
    [onPageSelect, onBlockSelect],
  )

  const handleBlockSelect = React.useCallback(
    (blockId: string) => {
      onBlockSelect(blockId)
      onPageSelect(null)
    },
    [onBlockSelect, onPageSelect],
  )

  const handleNodeClick = React.useCallback(
    (event: React.MouseEvent, node: Node<PageNodeData>) => {
      // Check if click was on a block - if so, don't select the page
      const target = event.target as HTMLElement
      if (target.closest('[data-slot="block"]')) {
        return
      }
      // Select the page
      handlePageSelect(node.id)
    },
    [handlePageSelect],
  )

  const { nodes, edges } = React.useMemo(() => {
    const edges = createEdges(pages, rules)
    const nodes: Node<PageNodeData>[] = pages.map((page, index) => ({
      id: page.id,
      type: 'page',
      position: { x: 0, y: 0 },
      className: 'focus-visible:outline-none',
      data: {
        page,
        theme,
        pageIndex: index,
        selected: selectedPageId === page.id,
        selectedBlockId,
        hasRules: rules.some((r) => r.pageId === page.id && r.actions.length > 0),
        isStart: index === 0,
        isEnd: !edges.some((e) => e.source === page.id),
        onPageSelect: handlePageSelect,
        onBlockSelect: handleBlockSelect,
        onLogicClick: () => onLogicClick(page.id),
      },
    }))
    return getLayoutedElements(nodes, edges)
  }, [pages, rules, theme, selectedPageId, selectedBlockId, handlePageSelect, handleBlockSelect, onLogicClick])

  return (
    <div className="size-full bg-background" data-slot="canvas">
      <ReactFlowProvider>
        <CanvasInner
          nodes={nodes}
          edges={edges}
          pages={pages}
          selectedPageId={selectedPageId}
          selectedBlockId={selectedBlockId}
          selectionSource={selectionSource}
          onPaneClick={handlePaneClick}
          onNodeClick={handleNodeClick}
          onThemeButtonClick={onThemeButtonClick}
        />
      </ReactFlowProvider>
    </div>
  )
}
