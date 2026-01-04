import { cn } from '@/lib/utils'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import {
  Background,
  Controls,
  PanOnScrollMode,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type CoordinateExtent,
  type Node,
  type NodeProps,
  type OnNodeDrag,
  type OnNodesChange,
  type XYPosition,
} from '@xyflow/react'
import { timer } from 'd3-timer'
import * as React from 'react'
import { ulid } from 'ulid'

import '@xyflow/react/dist/style.css'

// ============================================================================
// Types
// ============================================================================

type ParentCardData = {
  id: string
  label: string
}

type InnerCardData = {
  id: string
  parentId: string
  content: string
}

// Node data now only stores IDs - components look up actual data from context
type ParentCardNodeData = {
  cardId: string
}

type InnerCardNodeData = {
  cardId: string
  parentId: string
}

type ParentCardNodeType = Node<ParentCardNodeData, 'parentCard'>
type InnerCardNodeType = Node<InnerCardNodeData, 'innerCard'>
type CanvasNode = ParentCardNodeType | InnerCardNodeType

type DragState = {
  draggingId: string | null
  draggingType: 'parent' | 'inner' | null
  draggingParentId: string | null
  childrenOfDraggingParent: string[]
}

// Slot boundary for drag detection - calculated once at drag start
type SlotBoundary = {
  id: string
  top: number
  bottom: number
  center: number
}

// ============================================================================
// Constants
// ============================================================================

const PARENT_CARD_WIDTH = 280
const PARENT_CARD_MIN_HEIGHT = 120
const PARENT_CARD_HEADER_HEIGHT = 48
const PARENT_CARD_PADDING = 12
const PARENT_GAP = 32

const INNER_CARD_WIDTH = PARENT_CARD_WIDTH - PARENT_CARD_PADDING * 2
const INNER_CARD_GAP = 8
const INNER_CARD_FALLBACK_HEIGHT = 80 // Fallback for drag operations if measurement is missing

const DEFAULT_CARDS_PER_ROW = 3
const ANIMATION_DURATION = 200

// ============================================================================
// Context for data lookup and callbacks
// ============================================================================

type CanvasContextValue = {
  // Data lookups - stable references
  getParentCard: (id: string) => ParentCardData | undefined
  getInnerCard: (id: string) => InnerCardData | undefined
  // Callbacks
  onAddInnerCard: (parentId: string) => void
  onDeleteInnerCard: (id: string) => void
  isParentDragging: (innerCardId: string) => boolean
}

const CanvasContext = React.createContext<CanvasContextValue | null>(null)

function useCanvasContext() {
  const context = React.use(CanvasContext)
  if (!context) {
    throw new Error('useCanvasContext must be used within CanvasProvider')
  }
  return context
}

// ============================================================================
// Initial Data
// ============================================================================

const initialParentCards: ParentCardData[] = [
  { id: 'parent-1', label: 'To Do' },
  { id: 'parent-2', label: 'In Progress' },
  { id: 'parent-3', label: 'Done' },
]

const initialInnerCards: InnerCardData[] = [
  { id: 'inner-1', parentId: 'parent-1', content: 'Research React Flow sub-flows' },
  { id: 'inner-2', parentId: 'parent-1', content: 'Design the data model for nested cards with dynamic heights' },
  { id: 'inner-3', parentId: 'parent-1', content: 'Write tests' },
  {
    id: 'inner-4',
    parentId: 'parent-2',
    content: 'Implement vertical sorting within parent cards using React Flow drag events',
  },
  { id: 'inner-5', parentId: 'parent-2', content: 'Add delete functionality' },
  { id: 'inner-6', parentId: 'parent-3', content: 'Initial setup complete!' },
]

// Build initial Maps from arrays
function buildParentCardsMap(cards: ParentCardData[]): Map<string, ParentCardData> {
  return new Map(cards.map((c) => [c.id, c]))
}

function buildInnerCardsMap(cards: InnerCardData[]): Map<string, InnerCardData> {
  return new Map(cards.map((c) => [c.id, c]))
}

function buildInnerCardOrderMap(cards: InnerCardData[]): Map<string, string[]> {
  const orderMap = new Map<string, string[]>()
  for (const card of cards) {
    const existing = orderMap.get(card.parentId) ?? []
    existing.push(card.id)
    orderMap.set(card.parentId, existing)
  }
  return orderMap
}

// ============================================================================
// Helper Functions
// ============================================================================

function getParentPositionFromIndex(index: number, cardsPerRow: number): XYPosition {
  const row = Math.floor(index / cardsPerRow)
  const col = index % cardsPerRow
  return {
    x: col * (PARENT_CARD_WIDTH + PARENT_GAP),
    y: row * (PARENT_CARD_MIN_HEIGHT + PARENT_GAP),
  }
}

function getParentIndexFromPosition(x: number, y: number, cardsPerRow: number, totalCards: number): number {
  const col = Math.round(x / (PARENT_CARD_WIDTH + PARENT_GAP))
  const row = Math.round(y / (PARENT_CARD_MIN_HEIGHT + PARENT_GAP))
  const clampedCol = Math.max(0, Math.min(col, cardsPerRow - 1))
  const clampedRow = Math.max(0, row)
  const index = clampedRow * cardsPerRow + clampedCol
  return Math.max(0, Math.min(index, totalCards - 1))
}

function getInnerCardYPosition(index: number, siblingHeights: (number | undefined)[]): number {
  let y = PARENT_CARD_HEADER_HEIGHT
  for (let i = 0; i < index; i++) {
    const height = siblingHeights[i]
    if (height === undefined) continue
    y += height + INNER_CARD_GAP
  }
  return y
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const newArr = [...arr]
  const [item] = newArr.splice(from, 1)
  if (item !== undefined) {
    newArr.splice(to, 0, item)
  }
  return newArr
}

function calculateParentHeight(measuredHeights: Map<string, number>, innerCardIds: string[]): number {
  if (innerCardIds.length === 0) {
    return PARENT_CARD_MIN_HEIGHT
  }

  // Check if all cards are measured
  const allMeasured = innerCardIds.every((id) => measuredHeights.has(id))
  if (!allMeasured) {
    // Return a reasonable default until all cards are measured
    return PARENT_CARD_MIN_HEIGHT + innerCardIds.length * 80
  }

  let totalHeight = PARENT_CARD_HEADER_HEIGHT
  for (let i = 0; i < innerCardIds.length; i++) {
    const cardId = innerCardIds[i]
    if (cardId) {
      const height = measuredHeights.get(cardId)
      if (height !== undefined) {
        totalHeight += height
        if (i < innerCardIds.length - 1) {
          totalHeight += INNER_CARD_GAP
        }
      }
    }
  }
  totalHeight += PARENT_CARD_PADDING
  return Math.max(PARENT_CARD_MIN_HEIGHT, totalHeight)
}

function generateId(): string {
  return ulid()
}

// Easing function for smooth animations
function easeOutQuad(t: number): number {
  return t * (2 - t)
}

// ============================================================================
// Node Components (memoized for performance)
// Components look up data from context using stable IDs
// ============================================================================

const ParentCardNode = React.memo(function ParentCardNode({ data, dragging }: NodeProps<ParentCardNodeType>) {
  const { cardId } = data
  const { getParentCard, onAddInnerCard } = useCanvasContext()

  const card = getParentCard(cardId)
  if (!card) return null

  return (
    <div
      style={{ touchAction: 'none' }}
      className={cn(
        'flex h-full w-full flex-col rounded-xl border border-border bg-card shadow-sm',
        'transition-shadow duration-200',
        dragging && 'shadow-lg ring-2 ring-primary/20',
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold text-foreground">{card.label}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAddInnerCard(card.id)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            'transition-colors',
          )}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="relative flex-1" />
    </div>
  )
})

const InnerCardNode = React.memo(function InnerCardNode({ data, dragging }: NodeProps<InnerCardNodeType>) {
  const { cardId } = data
  const { getInnerCard, onDeleteInnerCard, isParentDragging } = useCanvasContext()

  const innerCard = getInnerCard(cardId)
  if (!innerCard) return null

  // Check if this card's parent is being dragged
  const parentBeingDragged = isParentDragging(cardId)

  return (
    <div
      style={{ touchAction: 'none' }}
      className={cn(
        'group flex w-full cursor-grab flex-col gap-2 rounded-lg border border-border bg-background p-3 shadow-sm',
        'hover:shadow-md active:cursor-grabbing',
        // Only apply transition when not dragging (for smooth reordering animation)
        !dragging && !parentBeingDragged && 'transition-shadow duration-200',
        dragging && 'shadow-lg ring-2 ring-primary/20',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm text-foreground">{innerCard.content}</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteInnerCard(innerCard.id)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded',
            // Always visible on touch devices, hover-reveal on desktop
            'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
            'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
            'transition-all',
          )}
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
})

// ============================================================================
// Main Components
// ============================================================================

export function Canvas() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  )
}

function Flow() {
  const { updateNode, fitView } = useReactFlow<CanvasNode>()

  // Node types - memoized per React Flow best practices
  const nodeTypes = React.useMemo(
    () => ({
      parentCard: ParentCardNode,
      innerCard: InnerCardNode,
    }),
    [],
  )

  const [cardsPerRow] = React.useState(DEFAULT_CARDS_PER_ROW)
  const [ready, setReady] = React.useState(false)

  // ============================================================================
  // Stable Data Stores (refs) - card data that rarely changes
  // ============================================================================
  const parentCardsMapRef = React.useRef<Map<string, ParentCardData>>(buildParentCardsMap(initialParentCards))
  const innerCardsMapRef = React.useRef<Map<string, InnerCardData>>(buildInnerCardsMap(initialInnerCards))

  // ============================================================================
  // Order State - tracks which cards exist and their order (changes on reorder/add/delete)
  // ============================================================================
  const [parentCardOrder, setParentCardOrder] = React.useState<string[]>(() => initialParentCards.map((c) => c.id))
  const [innerCardOrderMap, setInnerCardOrderMap] = React.useState<Map<string, string[]>>(() =>
    buildInnerCardOrderMap(initialInnerCards),
  )

  // ============================================================================
  // Drag State
  // ============================================================================
  const [dragState, setDragState] = React.useState<DragState>({
    draggingId: null,
    draggingType: null,
    draggingParentId: null,
    childrenOfDraggingParent: [],
  })

  // Synchronous ref to track dragging state immediately (before async state update)
  const isDraggingRef = React.useRef(false)

  const measuredHeightsRef = React.useRef<Map<string, number>>(new Map())
  const previewOrderRef = React.useRef<string[]>([])
  const animationTimersRef = React.useRef<Map<string, ReturnType<typeof timer>>>(new Map())
  const dropTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Slot boundaries calculated at drag start - remains stable during drag
  const slotBoundariesRef = React.useRef<SlotBoundary[]>([])
  const draggedCardHeightRef = React.useRef<number>(0)

  // Ref to store children of dragging parent (for stable isParentDragging function)
  const childrenOfDraggingParentRef = React.useRef<string[]>([])

  // ============================================================================
  // Stable Data Lookup Functions (for context)
  // ============================================================================
  const getParentCard = React.useCallback((id: string) => {
    return parentCardsMapRef.current.get(id)
  }, [])

  const getInnerCard = React.useCallback((id: string) => {
    return innerCardsMapRef.current.get(id)
  }, [])

  // ============================================================================
  // Animation Helpers
  // ============================================================================
  const cancelAnimations = React.useCallback(() => {
    animationTimersRef.current.forEach((t) => t.stop())
    animationTimersRef.current.clear()
  }, [])

  const animateNodePosition = React.useCallback(
    (nodeId: string, from: XYPosition, to: XYPosition) => {
      // Cancel any existing animation for this node
      const existingTimer = animationTimersRef.current.get(nodeId)
      if (existingTimer) {
        existingTimer.stop()
      }

      const startTime = Date.now()
      const t = timer(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1)
        const eased = easeOutQuad(progress)

        const currentPosition = {
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased,
        }

        updateNode(nodeId, { position: currentPosition })

        if (progress >= 1) {
          t.stop()
          animationTimersRef.current.delete(nodeId)
        }
      })

      animationTimersRef.current.set(nodeId, t)
    },
    [updateNode],
  )

  // ============================================================================
  // Callbacks for context
  // ============================================================================
  const handleAddInnerCard = React.useCallback((parentId: string) => {
    const newId = `inner-${generateId()}`
    const newInnerCard: InnerCardData = {
      id: newId,
      parentId,
      content: 'New card',
    }

    // Update stable data store
    innerCardsMapRef.current.set(newId, newInnerCard)

    // Update order state (triggers node creation)
    setInnerCardOrderMap((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(parentId) ?? []
      newMap.set(parentId, [...existing, newId])
      return newMap
    })
  }, [])

  const handleDeleteInnerCard = React.useCallback((id: string) => {
    const card = innerCardsMapRef.current.get(id)
    if (!card) return

    // Update order state first (triggers node removal)
    setInnerCardOrderMap((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(card.parentId) ?? []
      newMap.set(
        card.parentId,
        existing.filter((cardId) => cardId !== id),
      )
      return newMap
    })

    // Clean up data store and measurements
    innerCardsMapRef.current.delete(id)
    measuredHeightsRef.current.delete(id)
  }, [])

  const isParentDragging = React.useCallback((innerCardId: string) => {
    return childrenOfDraggingParentRef.current.includes(innerCardId)
  }, [])

  // ============================================================================
  // Context Value (stable - functions use refs internally)
  // ============================================================================
  const contextValue = React.useMemo<CanvasContextValue>(
    () => ({
      getParentCard,
      getInnerCard,
      onAddInnerCard: handleAddInnerCard,
      onDeleteInnerCard: handleDeleteInnerCard,
      isParentDragging,
    }),
    [getParentCard, getInnerCard, handleAddInnerCard, handleDeleteInnerCard, isParentDragging],
  )

  // ============================================================================
  // Build Initial Nodes (only called once or on structural changes)
  // ============================================================================
  const buildInitialNodes = React.useCallback((): CanvasNode[] => {
    const nodes: CanvasNode[] = []

    for (let i = 0; i < parentCardOrder.length; i++) {
      const cardId = parentCardOrder[i]
      if (!cardId) continue

      const childIds = innerCardOrderMap.get(cardId) ?? []
      const height = calculateParentHeight(measuredHeightsRef.current, childIds)
      const position = getParentPositionFromIndex(i, cardsPerRow)

      nodes.push({
        id: cardId,
        type: 'parentCard',
        position,
        data: { cardId },
        draggable: true,
        selectable: false,
        width: PARENT_CARD_WIDTH,
        height,
      } satisfies ParentCardNodeType)
    }

    for (const parentId of parentCardOrder) {
      const childIds = innerCardOrderMap.get(parentId) ?? []
      const siblingHeights = childIds.map((id) => measuredHeightsRef.current.get(id))

      for (let i = 0; i < childIds.length; i++) {
        const cardId = childIds[i]
        if (!cardId) continue

        const y = getInnerCardYPosition(i, siblingHeights)

        nodes.push({
          id: cardId,
          type: 'innerCard',
          position: { x: PARENT_CARD_PADDING, y },
          parentId: parentId,
          extent: 'parent',
          data: { cardId, parentId },
          draggable: true,
          selectable: false,
          width: INNER_CARD_WIDTH,
        } satisfies InnerCardNodeType)
      }
    }

    return nodes
  }, [parentCardOrder, innerCardOrderMap, cardsPerRow])

  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(buildInitialNodes())

  // ============================================================================
  // Sync nodes when structure changes (add/delete) - but NOT on reorder
  // ============================================================================
  const prevParentOrderLengthRef = React.useRef(parentCardOrder.length)
  const prevInnerOrderMapSizeRef = React.useRef(
    Array.from(innerCardOrderMap.values()).reduce((sum, arr) => sum + arr.length, 0),
  )

  React.useEffect(() => {
    // Skip during drag
    if (isDraggingRef.current || dragState.draggingId) return

    const currentParentLength = parentCardOrder.length
    const currentInnerCount = Array.from(innerCardOrderMap.values()).reduce((sum, arr) => sum + arr.length, 0)

    // Only rebuild if structure changed (add/delete), not just reorder
    const structureChanged =
      currentParentLength !== prevParentOrderLengthRef.current || currentInnerCount !== prevInnerOrderMapSizeRef.current

    if (structureChanged) {
      prevParentOrderLengthRef.current = currentParentLength
      prevInnerOrderMapSizeRef.current = currentInnerCount
      setNodes(buildInitialNodes())
    }
  }, [parentCardOrder, innerCardOrderMap, buildInitialNodes, setNodes, dragState.draggingId])

  // ============================================================================
  // Detect when all nodes have been measured
  // ============================================================================
  const nodesInitialized = useNodesInitialized()
  const hasRepositionedRef = React.useRef(false)

  React.useEffect(() => {
    if (nodesInitialized && !hasRepositionedRef.current && !dragState.draggingId) {
      hasRepositionedRef.current = true

      // Extract measured heights from current nodes
      for (const node of nodes) {
        if (node.type === 'innerCard' && node.measured?.height) {
          measuredHeightsRef.current.set(node.id, node.measured.height)
        }
      }

      // Update positions using functional setNodes (preserves object identity where possible)
      setNodes((currentNodes) => {
        return currentNodes.map((node) => {
          if (node.type === 'innerCard') {
            const { parentId } = node.data as InnerCardNodeData
            const siblingIds = innerCardOrderMap.get(parentId) ?? []
            const siblingIndex = siblingIds.indexOf(node.id)
            const siblingHeights = siblingIds.map((id) => measuredHeightsRef.current.get(id))
            const y = getInnerCardYPosition(siblingIndex, siblingHeights)

            if (node.position.y === y) return node // No change, preserve identity
            return { ...node, position: { ...node.position, y } }
          }

          if (node.type === 'parentCard') {
            const childIds = innerCardOrderMap.get(node.id) ?? []
            const height = calculateParentHeight(measuredHeightsRef.current, childIds)

            if (node.height === height) return node // No change, preserve identity
            return { ...node, height }
          }

          return node
        })
      })

      // Fit view after nodes are repositioned with correct measurements
      requestAnimationFrame(() => {
        fitView({ padding: 0.3 })
        setReady(true)
      })
    }
  }, [nodesInitialized, dragState.draggingId, innerCardOrderMap, nodes, setNodes, fitView])

  // ============================================================================
  // Calculate dynamic pan boundaries
  // ============================================================================
  const translateExtent = React.useMemo((): CoordinateExtent => {
    const PADDING = 500

    if (parentCardOrder.length === 0) {
      return [
        [-1000, -1000],
        [1000, 1000],
      ]
    }

    const lastIndex = parentCardOrder.length - 1
    const lastCol = lastIndex % cardsPerRow
    const lastRow = Math.floor(lastIndex / cardsPerRow)

    const maxX = (lastCol + 1) * (PARENT_CARD_WIDTH + PARENT_GAP)
    const maxY = (lastRow + 1) * (PARENT_CARD_MIN_HEIGHT + PARENT_GAP) + 200

    return [
      [-PADDING, -PADDING],
      [maxX + PADDING, maxY + PADDING],
    ]
  }, [parentCardOrder.length, cardsPerRow])

  // ============================================================================
  // Cleanup
  // ============================================================================
  React.useEffect(() => {
    return () => {
      cancelAnimations()
      if (dropTimeoutRef.current) {
        clearTimeout(dropTimeoutRef.current)
      }
    }
  }, [cancelAnimations])

  // ============================================================================
  // Handle dimension changes
  // ============================================================================
  const dimensionsChangedDuringDragRef = React.useRef(false)

  const handleNodesChange: OnNodesChange<CanvasNode> = React.useCallback(
    (changes) => {
      onNodesChange(changes)

      let dimensionsChanged = false
      for (const change of changes) {
        if (change.type === 'dimensions' && change.dimensions) {
          const node = nodes.find((n) => n.id === change.id)
          if (node?.type === 'innerCard') {
            const prevHeight = measuredHeightsRef.current.get(change.id)
            if (prevHeight !== change.dimensions.height) {
              measuredHeightsRef.current.set(change.id, change.dimensions.height)
              dimensionsChanged = true
            }
          }
        }
      }

      if (dimensionsChanged) {
        if (isDraggingRef.current) {
          dimensionsChangedDuringDragRef.current = true
        } else {
          // Update positions and heights using functional update (preserves identity)
          setNodes((currentNodes) => {
            return currentNodes.map((node) => {
              if (node.type === 'innerCard') {
                const { parentId } = node.data as InnerCardNodeData
                const siblingIds = innerCardOrderMap.get(parentId) ?? []
                const siblingIndex = siblingIds.indexOf(node.id)
                const siblingHeights = siblingIds.map((id) => measuredHeightsRef.current.get(id))
                const y = getInnerCardYPosition(siblingIndex, siblingHeights)

                if (node.position.y === y) return node
                return { ...node, position: { ...node.position, y } }
              }

              if (node.type === 'parentCard') {
                const childIds = innerCardOrderMap.get(node.id) ?? []
                const height = calculateParentHeight(measuredHeightsRef.current, childIds)

                if (node.height === height) return node
                return { ...node, height }
              }

              return node
            })
          })
        }
      }
    },
    [onNodesChange, nodes, innerCardOrderMap, setNodes],
  )

  // Handle deferred dimension updates after drag ends
  React.useEffect(() => {
    if (!dragState.draggingId && dimensionsChangedDuringDragRef.current) {
      dimensionsChangedDuringDragRef.current = false
      setNodes((currentNodes) => {
        return currentNodes.map((node) => {
          if (node.type === 'innerCard') {
            const { parentId } = node.data as InnerCardNodeData
            const siblingIds = innerCardOrderMap.get(parentId) ?? []
            const siblingIndex = siblingIds.indexOf(node.id)
            const siblingHeights = siblingIds.map((id) => measuredHeightsRef.current.get(id))
            const y = getInnerCardYPosition(siblingIndex, siblingHeights)

            if (node.position.y === y) return node
            return { ...node, position: { ...node.position, y } }
          }

          if (node.type === 'parentCard') {
            const childIds = innerCardOrderMap.get(node.id) ?? []
            const height = calculateParentHeight(measuredHeightsRef.current, childIds)

            if (node.height === height) return node
            return { ...node, height }
          }

          return node
        })
      })
    }
  }, [dragState.draggingId, innerCardOrderMap, setNodes])

  // ============================================================================
  // Drag Handlers
  // ============================================================================
  const handleNodeDragStart: OnNodeDrag<CanvasNode> = React.useCallback(
    (_, node) => {
      isDraggingRef.current = true
      cancelAnimations()

      if (node.type === 'parentCard') {
        const childIds = innerCardOrderMap.get(node.id) ?? []

        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) return { ...n, zIndex: 1000 }
            if (childIds.includes(n.id)) return { ...n, zIndex: 1001 }
            return n
          }),
        )

        childrenOfDraggingParentRef.current = childIds
        setDragState({
          draggingId: node.id,
          draggingType: 'parent',
          draggingParentId: node.id,
          childrenOfDraggingParent: childIds,
        })
        previewOrderRef.current = [...parentCardOrder]
        slotBoundariesRef.current = []
      } else if (node.type === 'innerCard') {
        const { parentId } = node.data as InnerCardNodeData
        const siblingIds = innerCardOrderMap.get(parentId) ?? []

        setNodes((nds) => nds.map((n) => (n.id === node.id ? { ...n, zIndex: 1000 } : n)))

        // Calculate stable slot boundaries at drag start
        const boundaries: SlotBoundary[] = []
        let y = PARENT_CARD_HEADER_HEIGHT
        for (const siblingId of siblingIds) {
          const height = measuredHeightsRef.current.get(siblingId) ?? INNER_CARD_FALLBACK_HEIGHT
          boundaries.push({
            id: siblingId,
            top: y,
            bottom: y + height,
            center: y + height / 2,
          })
          y += height + INNER_CARD_GAP
        }
        slotBoundariesRef.current = boundaries
        draggedCardHeightRef.current = measuredHeightsRef.current.get(node.id) ?? INNER_CARD_FALLBACK_HEIGHT

        setDragState({
          draggingId: node.id,
          draggingType: 'inner',
          draggingParentId: parentId,
          childrenOfDraggingParent: [],
        })
        previewOrderRef.current = [...siblingIds]
      }
    },
    [parentCardOrder, innerCardOrderMap, cancelAnimations, setNodes],
  )

  const handleNodeDrag: OnNodeDrag<CanvasNode> = React.useCallback(
    (_, node) => {
      if (!dragState.draggingId) return

      if (dragState.draggingType === 'parent') {
        const fromIndex = previewOrderRef.current.indexOf(dragState.draggingId)
        const toIndex = getParentIndexFromPosition(
          node.position.x,
          node.position.y,
          cardsPerRow,
          parentCardOrder.length,
        )

        if (fromIndex === toIndex) return

        const newPreviewOrder = arrayMove(previewOrderRef.current, fromIndex, toIndex)
        previewOrderRef.current = newPreviewOrder

        for (const parentId of newPreviewOrder) {
          if (parentId === dragState.draggingId) continue

          const previewIndex = newPreviewOrder.indexOf(parentId)
          const targetPosition = getParentPositionFromIndex(previewIndex, cardsPerRow)

          const currentNode = nodes.find((n) => n.id === parentId)
          if (currentNode) {
            animateNodePosition(parentId, currentNode.position, targetPosition)
          }
        }
      } else if (dragState.draggingType === 'inner') {
        const boundaries = slotBoundariesRef.current
        if (boundaries.length === 0) return

        const draggedCardCenter = node.position.y + draggedCardHeightRef.current / 2

        let targetSlotIndex = 0
        let minDistance = Infinity

        for (let i = 0; i < boundaries.length; i++) {
          const slot = boundaries[i]
          if (!slot) continue

          const distance = Math.abs(draggedCardCenter - slot.center)
          if (distance < minDistance) {
            minDistance = distance
            targetSlotIndex = i
          }
        }

        targetSlotIndex = Math.min(Math.max(0, targetSlotIndex), previewOrderRef.current.length - 1)

        const fromIndex = previewOrderRef.current.indexOf(dragState.draggingId)
        if (fromIndex === targetSlotIndex) return

        const newPreviewOrder = arrayMove(previewOrderRef.current, fromIndex, targetSlotIndex)
        previewOrderRef.current = newPreviewOrder

        const newSiblingHeights = newPreviewOrder.map(
          (id) => measuredHeightsRef.current.get(id) ?? INNER_CARD_FALLBACK_HEIGHT,
        )

        for (const siblingId of newPreviewOrder) {
          if (siblingId === dragState.draggingId) continue

          const previewIndex = newPreviewOrder.indexOf(siblingId)
          const targetPosition = { x: PARENT_CARD_PADDING, y: getInnerCardYPosition(previewIndex, newSiblingHeights) }

          const currentNode = nodes.find((n) => n.id === siblingId)
          if (currentNode) {
            animateNodePosition(siblingId, currentNode.position, targetPosition)
          }
        }
      }
    },
    [dragState, parentCardOrder.length, cardsPerRow, nodes, animateNodePosition],
  )

  const handleNodeDragStop: OnNodeDrag<CanvasNode> = React.useCallback(
    (_, node) => {
      if (!dragState.draggingId) return

      const previewOrder = previewOrderRef.current

      if (dragState.draggingType === 'parent') {
        for (const parentId of previewOrder) {
          const targetIndex = previewOrder.indexOf(parentId)
          const targetPosition = getParentPositionFromIndex(targetIndex, cardsPerRow)

          const currentNode = nodes.find((n) => n.id === parentId)
          if (currentNode) {
            animateNodePosition(parentId, currentNode.position, targetPosition)
          }
        }
      } else if (dragState.draggingType === 'inner') {
        const newSiblingHeights = previewOrder.map(
          (id) => measuredHeightsRef.current.get(id) ?? INNER_CARD_FALLBACK_HEIGHT,
        )

        for (const siblingId of previewOrder) {
          const targetIndex = previewOrder.indexOf(siblingId)
          const targetPosition = {
            x: PARENT_CARD_PADDING,
            y: getInnerCardYPosition(targetIndex, newSiblingHeights),
          }

          const currentNode = nodes.find((n) => n.id === siblingId)
          if (currentNode) {
            animateNodePosition(siblingId, currentNode.position, targetPosition)
          }
        }
      }

      const draggingType = dragState.draggingType
      const draggedNodeId = dragState.draggingId
      const draggedChildIds = dragState.childrenOfDraggingParent
      const finalOrder = [...previewOrder]
      const innerCardParentId = draggingType === 'inner' ? (node.data as InnerCardNodeData).parentId : null

      dropTimeoutRef.current = setTimeout(() => {
        // Reset z-index using functional update (preserves identity)
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === draggedNodeId && n.zIndex !== undefined) return { ...n, zIndex: undefined }
            if (draggedChildIds.includes(n.id) && n.zIndex !== undefined) return { ...n, zIndex: undefined }
            return n
          }),
        )

        // Update order state - this does NOT trigger a full rebuild anymore
        // because we check for structural changes (add/delete), not just reorder
        if (draggingType === 'parent') {
          setParentCardOrder(finalOrder)
        } else if (draggingType === 'inner' && innerCardParentId) {
          setInnerCardOrderMap((prev) => {
            const newMap = new Map(prev)
            newMap.set(innerCardParentId, finalOrder)
            return newMap
          })
        }

        setDragState({
          draggingId: null,
          draggingType: null,
          draggingParentId: null,
          childrenOfDraggingParent: [],
        })

        isDraggingRef.current = false
        childrenOfDraggingParentRef.current = []
        previewOrderRef.current = []
        slotBoundariesRef.current = []
      }, ANIMATION_DURATION)
    },
    [dragState, cardsPerRow, nodes, animateNodePosition, setNodes],
  )

  return (
    <CanvasContext value={contextValue}>
      <ReactFlow<CanvasNode>
        className={cn('transition-opacity duration-200', !ready && 'opacity-0')}
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        fitView={false}
        // Panning
        panOnDrag
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        // Zooming
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick
        minZoom={0.1}
        maxZoom={3}
        // Boundaries
        translateExtent={translateExtent}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background gap={20} size={1} />
        <Controls
          showInteractive={false}
          fitViewOptions={{ padding: 0.3 }}
          className={cn(
            '[&>button]:border-border [&>button]:bg-card [&>button]:text-muted-foreground',
            '[&>button:hover]:bg-accent [&>button:hover]:text-accent-foreground',
            '[&>button]:fill-current',
          )}
        />
      </ReactFlow>
    </CanvasContext>
  )
}
