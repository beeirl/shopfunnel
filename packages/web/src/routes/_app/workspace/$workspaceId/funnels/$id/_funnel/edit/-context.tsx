import type { Block, Page } from '@shopfunnel/core/funnel/types'
import * as React from 'react'
import { useFunnel } from '../-context'

// =============================================================================
// Context
// =============================================================================

interface FunnelEditorContextValue {
  // Left panel state
  activePageId: string | null

  // Right panel state (mutually exclusive)
  selectedPageId: string | null
  selectedBlockId: string | null
  showThemePanel: boolean
  showLogicPanel: boolean

  // For viewport panning
  selectionSource: 'panel' | 'canvas' | null

  // Actions
  selectPage: (pageId: string | null, source?: 'panel' | 'canvas') => void
  selectBlock: (blockId: string | null, pageId: string | null, source?: 'panel' | 'canvas') => void
  showTheme: () => void
  showLogic: (pageId: string) => void
  closeLogic: () => void

  // Derived state
  activePage: Page | null
  selectedPage: Page | null
  selectedBlock: Block | null
}

const FunnelEditorContext = React.createContext<FunnelEditorContextValue | null>(null)

export function useFunnelEditor() {
  const context = React.use(FunnelEditorContext)
  if (!context) throw new Error('useFunnelEditor must be used within FunnelEditorProvider')
  return context
}

// =============================================================================
// Provider
// =============================================================================

interface FunnelEditorProviderProps {
  children: React.ReactNode
}

export function FunnelEditorProvider({ children }: FunnelEditorProviderProps) {
  const { data: funnel } = useFunnel()

  // Left panel state
  const [activePageId, setActivePageId] = React.useState<string | null>(funnel.pages[0]?.id ?? null)

  // Right panel state
  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(funnel.pages[0]?.id ?? null)
  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
  const [showThemePanel, setShowThemePanel] = React.useState(false)
  const [showLogicPanel, setShowLogicPanel] = React.useState(false)

  // For viewport panning
  const [selectionSource, setSelectionSource] = React.useState<'panel' | 'canvas' | null>(null)

  // Actions
  const selectPage = React.useCallback((pageId: string | null, source: 'panel' | 'canvas' = 'canvas') => {
    setActivePageId(pageId)
    setSelectedPageId(pageId)
    setSelectedBlockId(null)
    setSelectionSource(source)
    setShowThemePanel(false)
    setShowLogicPanel(false)
  }, [])

  const selectBlock = React.useCallback(
    (blockId: string | null, pageId: string | null, source: 'panel' | 'canvas' = 'canvas') => {
      if (pageId) {
        setActivePageId(pageId)
      }
      setSelectedBlockId(blockId)
      setSelectedPageId(null)
      setSelectionSource(source)
      setShowThemePanel(false)
      setShowLogicPanel(false)
    },
    [],
  )

  const showTheme = React.useCallback(() => {
    setSelectedPageId(null)
    setSelectedBlockId(null)
    setShowLogicPanel(false)
    setShowThemePanel(true)
  }, [])

  const showLogic = React.useCallback((pageId: string) => {
    setActivePageId(pageId)
    setSelectedPageId(pageId)
    setSelectedBlockId(null)
    setShowThemePanel(false)
    setShowLogicPanel(true)
  }, [])

  const closeLogic = React.useCallback(() => {
    setShowLogicPanel(false)
  }, [])

  // Derived state
  const activePage = funnel.pages.find((p) => p.id === activePageId) ?? null
  const selectedPage = funnel.pages.find((p) => p.id === selectedPageId) ?? null
  const selectedBlock = funnel.pages.flatMap((p) => p.blocks).find((b) => b.id === selectedBlockId) ?? null

  const value = React.useMemo<FunnelEditorContextValue>(
    () => ({
      activePageId,
      selectedPageId,
      selectedBlockId,
      showThemePanel,
      showLogicPanel,
      selectionSource,
      selectPage,
      selectBlock,
      showTheme,
      showLogic,
      closeLogic,
      activePage,
      selectedPage,
      selectedBlock,
    }),
    [
      activePageId,
      selectedPageId,
      selectedBlockId,
      showThemePanel,
      showLogicPanel,
      selectionSource,
      selectPage,
      selectBlock,
      showTheme,
      showLogic,
      closeLogic,
      activePage,
      selectedPage,
      selectedBlock,
    ],
  )

  return <FunnelEditorContext.Provider value={value}>{children}</FunnelEditorContext.Provider>
}
