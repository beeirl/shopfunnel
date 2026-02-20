import { AlertDialog } from '@/components/ui/alert-dialog'
import type { Block, ComparisonCondition, Condition, Page, Rule, RuleAction } from '@shopfunnel/core/funnel/types'
import * as React from 'react'
import { ulid } from 'ulid'
import { SaveFunnelInput, useFunnel } from '../-context'

function checkBrokenRules(pages: Page[], rules: Rule[]): boolean {
  const cleaned = cleanBrokenRules(pages, rules)
  return JSON.stringify(cleaned) !== JSON.stringify(rules)
}

function cleanBrokenRules(pages: Page[], rules: Rule[]): Rule[] {
  const pageIndex = new Map(pages.map((p, i) => [p.id, i]))
  const blockPageIndex = new Map(pages.flatMap((page, i) => page.blocks.map((block) => [block.id, i])))
  const allBlocks = new Map(pages.flatMap((page) => page.blocks.map((block) => [block.id, block])))

  const getOptionIds = (blockId: string) => {
    const block = allBlocks.get(blockId)
    if (!block) return null
    if (block.type === 'multiple_choice' || block.type === 'picture_choice' || block.type === 'dropdown') {
      return new Set(block.properties.options.map((o) => o.id))
    }
    return null
  }

  const isComparisonBroken = (cond: ComparisonCondition, rulePageIdx: number) => {
    if (cond.op === 'always') return false
    if (!('vars' in cond)) return false

    const blockVar = cond.vars.find((v) => v.type === 'block')
    if (blockVar) {
      const blockId = String(blockVar.value)
      const blockIdx = blockPageIndex.get(blockId)
      if (blockIdx === undefined || blockIdx > rulePageIdx) return true

      const constantVar = cond.vars.find((v) => v.type === 'constant')
      if (constantVar) {
        const optionIds = getOptionIds(blockId)
        if (optionIds && !optionIds.has(String(constantVar.value))) return true
      }
    }

    return false
  }

  const cleanCondition = (condition: Condition, rulePageIdx: number): Condition | null => {
    if (condition.op === 'always') return condition

    if (condition.op === 'and' || condition.op === 'or') {
      const validVars = condition.vars.filter((c) => !isComparisonBroken(c, rulePageIdx))
      if (validVars.length === 0) return null
      if (validVars.length === 1) return validVars[0]!
      return { ...condition, vars: validVars }
    }

    if (isComparisonBroken(condition as ComparisonCondition, rulePageIdx)) return null
    return condition
  }

  const cleanAction = (action: RuleAction, rulePageIdx: number): RuleAction | null => {
    if (action.details.to?.type === 'page') {
      const targetIdx = pageIndex.get(action.details.to.value)
      if (targetIdx === undefined || targetIdx <= rulePageIdx) return null
    }

    if (action.details.target?.type === 'block') {
      if (!blockPageIndex.has(action.details.target.value)) return null
    }

    const cleanedCondition = cleanCondition(action.condition, rulePageIdx)
    if (!cleanedCondition) return null

    return { ...action, condition: cleanedCondition }
  }

  return rules
    .filter((rule) => pageIndex.has(rule.pageId))
    .map((rule) => {
      const rulePageIdx = pageIndex.get(rule.pageId)!
      const cleanedActions = rule.actions
        .map((action) => cleanAction(action, rulePageIdx))
        .filter((a): a is RuleAction => a !== null)
      return { ...rule, actions: cleanedActions }
    })
    .filter((rule) => rule.actions.length > 0)
}

function cloneBlock(block: Block): Block {
  const cloned = { ...block, id: ulid() }
  if (
    (cloned.type === 'multiple_choice' || cloned.type === 'picture_choice' || cloned.type === 'dropdown') &&
    'options' in cloned.properties
  ) {
    return {
      ...cloned,
      properties: {
        ...cloned.properties,
        options: cloned.properties.options.map((option) => ({ ...option, id: ulid() })),
      },
    } as Block
  }
  return cloned
}

interface FunnelEditorContextValue {
  activePageId: string | null

  selectedPageId: string | null
  selectedBlockId: string | null
  showThemePanel: boolean
  showLogicPanel: boolean

  activePage: Page | null
  selectedPage: Page | null
  selectedBlock: Block | null

  selectionSource: 'panel' | 'canvas' | null

  save: (input: SaveFunnelInput, onCancel?: () => void) => void
  selectPage: (pageId: string | null, source?: 'panel' | 'canvas') => void
  selectBlock: (blockId: string | null, pageId: string | null, source?: 'panel' | 'canvas') => void
  deletePage: (pageId: string) => void
  deleteBlock: (blockId: string) => void
  duplicatePage: (pageId: string) => void
  duplicateBlock: (blockId: string) => void
  showTheme: () => void
  showLogic: (pageId: string) => void
  closeLogic: () => void
}

const FunnelEditorContext = React.createContext<FunnelEditorContextValue | null>(null)

export function useFunnelEditor() {
  const context = React.use(FunnelEditorContext)
  if (!context) throw new Error('useFunnelEditor must be used within FunnelEditorProvider')
  return context
}

const confirmationDialogHandle = AlertDialog.createHandle<{
  input: SaveFunnelInput
  onCancel?: () => void
}>()

export function FunnelEditorProvider({ children }: { children: React.ReactNode }) {
  const funnel = useFunnel()

  const [activePageId, setActivePageId] = React.useState<string | null>(funnel.data.pages[0]?.id ?? null)

  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(funnel.data.pages[0]?.id ?? null)
  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
  const [showThemePanel, setShowThemePanel] = React.useState(false)
  const [showLogicPanel, setShowLogicPanel] = React.useState(false)

  const [selectionSource, setSelectionSource] = React.useState<'panel' | 'canvas' | null>(null)

  const save = (input: SaveFunnelInput) => {
    const pages = input.pages ?? funnel.data.pages
    const rules = input.rules ?? funnel.data.rules
    funnel.maybeSave({ ...input, rules: cleanBrokenRules(pages, rules) })
  }

  const maybeSave = (input: SaveFunnelInput, onCancel?: () => void) => {
    const pages = input.pages ?? funnel.data.pages
    const rules = input.rules ?? funnel.data.rules
    if (checkBrokenRules(pages, rules)) {
      confirmationDialogHandle.openWithPayload({ input, onCancel })
      return
    }

    funnel.maybeSave(input)
  }

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

  const deletePage = (pageId: string) => {
    const updatedPages = funnel.data.pages.filter((page) => page.id !== pageId)
    maybeSave({ pages: updatedPages })
    setSelectedPageId(null)
    setSelectedBlockId(null)
    setShowThemePanel(false)
    setShowLogicPanel(false)
  }

  const deleteBlock = (blockId: string) => {
    const updatedPages = funnel.data.pages.map((page) => ({
      ...page,
      blocks: page.blocks.filter((block) => block.id !== blockId),
    }))
    maybeSave({ pages: updatedPages })
    setSelectedBlockId(null)
    setSelectedPageId(null)
    setShowThemePanel(false)
    setShowLogicPanel(false)
  }

  const duplicatePage = (pageId: string) => {
    const pageIndex = funnel.data.pages.findIndex((p) => p.id === pageId)
    if (pageIndex === -1) return
    const page = funnel.data.pages[pageIndex]!

    const clonedPage: Page = {
      ...page,
      id: ulid(),
      name: `${page.name} copy`,
      blocks: page.blocks.map(cloneBlock),
    }

    const updatedPages = [...funnel.data.pages]
    updatedPages.splice(pageIndex + 1, 0, clonedPage)
    maybeSave({ pages: updatedPages })
    selectPage(clonedPage.id, 'panel')
  }

  const duplicateBlock = (blockId: string) => {
    if (!activePageId) return
    const page = funnel.data.pages.find((p) => p.id === activePageId)
    if (!page) return

    const blockIndex = page.blocks.findIndex((b) => b.id === blockId)
    if (blockIndex === -1) return

    const clonedBlock = cloneBlock(page.blocks[blockIndex]!)
    const updatedBlocks = [...page.blocks]
    updatedBlocks.splice(blockIndex + 1, 0, clonedBlock)

    const updatedPages = funnel.data.pages.map((p) => (p.id === activePageId ? { ...p, blocks: updatedBlocks } : p))
    maybeSave({ pages: updatedPages })
    selectBlock(clonedBlock.id, activePageId, 'panel')
  }

  const activePage = funnel.data.pages.find((p) => p.id === activePageId) ?? null
  const selectedPage = funnel.data.pages.find((p) => p.id === selectedPageId) ?? null
  const selectedBlock = funnel.data.pages.flatMap((p) => p.blocks).find((b) => b.id === selectedBlockId) ?? null

  const value = React.useMemo<FunnelEditorContextValue>(
    () => ({
      activePageId,
      selectedPageId,
      selectedBlockId,
      activePage,
      selectedPage,
      selectedBlock,
      showThemePanel,
      showLogicPanel,
      selectionSource,
      save: maybeSave,
      selectPage,
      selectBlock,
      deletePage,
      deleteBlock,
      duplicatePage,
      duplicateBlock,
      showTheme,
      showLogic,
      closeLogic,
    }),
    [
      activePageId,
      selectedPageId,
      selectedBlockId,
      activePage,
      selectedPage,
      selectedBlock,
      showThemePanel,
      showLogicPanel,
      selectionSource,
      maybeSave,
      selectPage,
      selectBlock,
      deletePage,
      deleteBlock,
      duplicatePage,
      duplicateBlock,
      showTheme,
      showLogic,
      closeLogic,
    ],
  )

  return (
    <FunnelEditorContext.Provider value={value}>
      {children}
      <AlertDialog.Root handle={confirmationDialogHandle}>
        {({ payload }) => (
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Apply change?</AlertDialog.Title>
              <AlertDialog.Description>
                Some existing logic rules are incompatible with this change and will be automatically adjusted or
                removed.
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel
                onClick={() => {
                  if (!payload) return
                  payload.onCancel?.()
                }}
              >
                Cancel
              </AlertDialog.Cancel>
              <AlertDialog.Action
                variant="destructive"
                onClick={() => {
                  if (!payload) return
                  save(payload.input)
                }}
              >
                Apply
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        )}
      </AlertDialog.Root>
    </FunnelEditorContext.Provider>
  )
}
