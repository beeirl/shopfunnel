import { Block } from '@/components/block'
import { getThemeCssVars } from '@/components/quiz'
import * as dagre from '@dagrejs/dagre'
import type { Page, Rule, Theme } from '@shopfunnel/core/quiz/types'
import { createFileRoute } from '@tanstack/react-router'
import { Background, BackgroundVariant, Handle, Position, ReactFlow, type Edge, type Node } from '@xyflow/react'
import * as React from 'react'

import { mockPages, mockRules, mockTheme } from './-logic.mock'

import '@xyflow/react/dist/style.css'

// ============================================
// Constants
// ============================================

const NODE_WIDTH = 393
const NODE_HEIGHT = 852

// ============================================
// Components
// ============================================

interface PageNodeData extends Record<string, unknown> {
  page: Page
  theme: Theme
}

function PageNode({ data }: { data: PageNodeData }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      <div className="shrink-0 border-b border-border bg-muted/50 px-4 py-3">
        <span className="text-sm font-medium text-foreground">{data.page.name}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4" style={getThemeCssVars(data.theme)}>
        <div className="flex flex-col">
          {data.page.blocks.map((block, index) => (
            <Block key={block.id} block={block} index={index} static />
          ))}
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-border" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-border" />
    </div>
  )
}

const nodeTypes = { page: PageNode }

// Layout constants
const COLUMN_GAP = 100 // Horizontal gap between columns
const ROW_GAP = 100 // Vertical gap between nodes in same column

/**
 * Layout nodes using dagre for automatic graph layout.
 * Uses the 'longest-path' ranker which works well for DAGs with branches/merges.
 */
function getLayoutedElements(
  nodes: Node<PageNodeData>[],
  edges: Edge[],
): { nodes: Node<PageNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

  g.setGraph({
    rankdir: 'LR', // Left to right (horizontal layout)
    nodesep: ROW_GAP, // Vertical spacing between nodes in same column
    ranksep: COLUMN_GAP, // Horizontal spacing between columns
    ranker: 'longest-path', // Better for DAGs with branches/merges
  })

  // Add nodes with dimensions
  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  // Add edges
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  // Run layout
  dagre.layout(g)

  // Map back to React Flow format
  // Dagre positions are center-based, React Flow uses top-left
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// ============================================
// Route
// ============================================

export const Route = createFileRoute('/workspace/$workspaceId/logic')({
  component: RouteComponent,
  ssr: false,
})

function RouteComponent() {
  const { nodes, edges } = React.useMemo(() => {
    // Create nodes from pages
    const initialNodes: Node<PageNodeData>[] = mockPages.map((page) => ({
      id: page.id,
      type: 'page',
      position: { x: 0, y: 0 },
      data: { page, theme: mockTheme },
    }))

    // Create edges
    const edgeSet = new Set<string>()
    const initialEdges: Edge[] = []

    // 1. Collect pageIds that have jump rules
    const pagesWithJumpRules = new Set<string>()
    mockRules.forEach((rule) => {
      const hasJumpAction = rule.actions.some((action) => action.type === 'jump' && action.details.to?.value)
      if (hasJumpAction) {
        pagesWithJumpRules.add(rule.pageId)
      }
    })

    // 2. Sequential edges - ONLY if page has NO jump rules AND NO redirectUrl
    for (let i = 0; i < mockPages.length - 1; i++) {
      const sourcePage = mockPages[i]
      const targetPage = mockPages[i + 1]
      if (!sourcePage || !targetPage) continue

      const hasJumpRules = pagesWithJumpRules.has(sourcePage.id)
      const hasRedirect = !!sourcePage.properties.redirectUrl

      // Skip sequential edge if page has jump rules or is a terminal page (has redirect)
      if (hasJumpRules || hasRedirect) continue

      const sourceId = sourcePage.id
      const targetId = targetPage.id
      const edgeId = `seq-${sourceId}-${targetId}`

      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId)
        initialEdges.push({
          id: edgeId,
          source: sourceId,
          target: targetId,
          type: 'bezier',
        })
      }
    }

    // 3. Conditional jump edges from rules
    mockRules.forEach((rule: Rule) => {
      rule.actions.forEach((action) => {
        if (action.type === 'jump' && action.details.to?.value) {
          const sourceId = rule.pageId
          const targetId = action.details.to.value
          const edgeId = `jump-${sourceId}-${targetId}`

          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId)
            initialEdges.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              type: 'bezier',
            })
          }
        }
      })
    })

    return getLayoutedElements(initialNodes, initialEdges)
  }, [])

  return (
    <div className="h-screen w-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        minZoom={0.01}
        maxZoom={1}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  )
}
