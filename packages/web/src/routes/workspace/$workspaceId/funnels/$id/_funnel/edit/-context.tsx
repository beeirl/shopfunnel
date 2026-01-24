import type { Block, Page } from '@shopfunnel/core/funnel/types'
import * as React from 'react'
import { useFunnel } from '../-context'

// =============================================================================
// Context
// =============================================================================

interface FunnelEditorContextValue {
  // UI State
  selectedPageId: string | null
  selectedBlockId: string | null
  selectionSource: 'panel' | 'canvas' | null
  showThemePanel: boolean
  selectedLogicPageId: string | null

  // UI Actions
  selectPage: (pageId: string | null, source?: 'panel' | 'canvas') => void
  selectBlock: (blockId: string | null, source?: 'panel' | 'canvas') => void
  showTheme: () => void
  showLogic: (pageId: string) => void
  closeLogic: () => void

  // Derived state
  selectedPage: Page | null
  selectedBlock: Block | null
  selectedLogicPage: Page | null
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

  // UI State
  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(funnel.pages[0]?.id ?? null)
  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
  const [selectionSource, setSelectionSource] = React.useState<'panel' | 'canvas' | null>(null)
  const [showThemePanel, setShowThemePanel] = React.useState(false)
  const [selectedLogicPageId, setSelectedLogicPageId] = React.useState<string | null>(null)

  // UI Actions
  const selectPage = React.useCallback((pageId: string | null, source: 'panel' | 'canvas' = 'canvas') => {
    setSelectedPageId(pageId)
    setSelectedBlockId(null)
    setSelectionSource(source)
    setShowThemePanel(false)
    setSelectedLogicPageId(null)
  }, [])

  const selectBlock = React.useCallback((blockId: string | null, source: 'panel' | 'canvas' = 'canvas') => {
    setSelectedBlockId(blockId)
    setSelectionSource(source)
    setShowThemePanel(false)
    setSelectedLogicPageId(null)
  }, [])

  const showTheme = React.useCallback(() => {
    setSelectedPageId(null)
    setSelectedBlockId(null)
    setSelectedLogicPageId(null)
    setShowThemePanel(true)
  }, [])

  const showLogic = React.useCallback((pageId: string) => {
    setSelectedLogicPageId(pageId)
    setSelectedPageId(null)
    setSelectedBlockId(null)
    setShowThemePanel(false)
  }, [])

  const closeLogic = React.useCallback(() => {
    setSelectedLogicPageId(null)
  }, [])

  // Derived state
  const selectedPage = funnel.pages.find((p) => p.id === selectedPageId) ?? null
  const selectedBlock = funnel.pages.flatMap((p) => p.blocks).find((b) => b.id === selectedBlockId) ?? null
  const selectedLogicPage = funnel.pages.find((p) => p.id === selectedLogicPageId) ?? null

  const value = React.useMemo<FunnelEditorContextValue>(
    () => ({
      selectedPageId,
      selectedBlockId,
      selectionSource,
      showThemePanel,
      selectedLogicPageId,
      selectPage,
      selectBlock,
      showTheme,
      showLogic,
      closeLogic,
      selectedPage,
      selectedBlock,
      selectedLogicPage,
    }),
    [
      selectedPageId,
      selectedBlockId,
      selectionSource,
      showThemePanel,
      selectedLogicPageId,
      selectPage,
      selectBlock,
      showTheme,
      showLogic,
      closeLogic,
      selectedPage,
      selectedBlock,
      selectedLogicPage,
    ],
  )

  return <FunnelEditorContext.Provider value={value}>{children}</FunnelEditorContext.Provider>
}
