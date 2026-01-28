import { getBlockInfo } from '@/components/block'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type {
  Block as BlockType,
  ComparisonCondition as ComparisonConditionType,
  Condition as ConditionType,
  LogicalCondition as LogicalConditionType,
  Page as PageType,
  RuleAction as RuleActionType,
} from '@shopfunnel/core/funnel/types'
import { INPUT_BLOCKS } from '@shopfunnel/core/funnel/types'
import { IconPlus as PlusIcon, IconTrash as TrashIcon } from '@tabler/icons-react'
import * as React from 'react'
import { useFunnelEditor } from '../-context'
import { useFunnel } from '../../-context'
import { Pane } from './pane'
import { Panel } from './panel'

// =============================================================================
// Types
// =============================================================================

type InputBlock = Extract<BlockType, { type: 'text_input' | 'multiple_choice' | 'picture_choice' | 'dropdown' }>

interface RuleProps {
  action: RuleActionType
  inputBlocks: InputBlock[]
  pages: PageType[]
  currentPageId: string
  onActionChange: (action: RuleActionType) => void
  onRemove: () => void
}

// =============================================================================
// Helpers
// =============================================================================

function getAvailableInputBlocks(pages: PageType[], currentPageId: string): InputBlock[] {
  const currentPageIndex = pages.findIndex((p) => p.id === currentPageId)
  if (currentPageIndex < 0) return []

  const inputBlocks: InputBlock[] = []
  for (let i = 0; i <= currentPageIndex; i++) {
    const page = pages[i]
    if (!page) continue
    const pageInputBlocks = page.blocks.filter((block): block is InputBlock =>
      INPUT_BLOCKS.includes(block.type as (typeof INPUT_BLOCKS)[number]),
    )
    inputBlocks.push(...pageInputBlocks)
  }
  return inputBlocks
}

function isLogicalCondition(condition: ConditionType): condition is LogicalConditionType {
  return condition.op === 'and' || condition.op === 'or'
}

function getBlockOptions(block: InputBlock): Array<{ id: string; label: string }> {
  if (block.type === 'multiple_choice' || block.type === 'picture_choice' || block.type === 'dropdown') {
    return block.properties.options
  }
  return []
}

const COMPARISON_OPERATORS = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
] as const

const LOGICAL_OPERATORS = [
  { value: 'and', label: 'and' },
  { value: 'or', label: 'or' },
] as const

// =============================================================================
// UI Primitives
// =============================================================================

interface BlockSelectProps {
  value: string | undefined
  onValueChange: (value: string) => void
  blocks: InputBlock[]
  placeholder?: string
  className?: string
}

function BlockSelect({
  value,
  onValueChange,
  blocks,
  placeholder = 'Select question...',
  className,
}: BlockSelectProps) {
  return (
    <Select.Root value={value ?? ''} onValueChange={onValueChange}>
      <Select.Trigger className={cn('min-w-0 flex-1', className)}>
        <Select.Value>
          {(selectedValue) => {
            if (!selectedValue) return placeholder
            const block = blocks.find((b) => b.id === selectedValue)
            if (!block) return selectedValue
            const blockInfo = getBlockInfo(block.type)
            const BlockIcon = blockInfo.icon
            return (
              <span className="flex items-center gap-2">
                <BlockIcon className="size-4 text-muted-foreground" />
                {block.properties.name || blockInfo.name}
              </span>
            )
          }}
        </Select.Value>
      </Select.Trigger>
      <Select.Content align="start" alignItemWithTrigger={false}>
        <Select.Group>
          {blocks.map((block) => {
            const blockInfo = getBlockInfo(block.type)
            const BlockIcon = blockInfo.icon
            return (
              <Select.Item key={block.id} value={block.id}>
                <span className="flex items-center gap-2">
                  <BlockIcon className="size-4 text-muted-foreground" />
                  {block.properties.name || blockInfo.name}
                </span>
              </Select.Item>
            )
          })}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  )
}

interface LogicalOperatorSelectProps {
  value: 'and' | 'or'
  onValueChange: (value: 'and' | 'or') => void
  className?: string
}

function LogicalOperatorSelect({ value, onValueChange, className }: LogicalOperatorSelectProps) {
  return (
    <Select.Root items={LOGICAL_OPERATORS} value={value} onValueChange={onValueChange as (value: string) => void}>
      <Select.Trigger className={className}>
        <Select.Value />
      </Select.Trigger>
      <Select.Content align="start" alignItemWithTrigger={false}>
        <Select.Group>
          {LOGICAL_OPERATORS.map((op) => (
            <Select.Item key={op.value} value={op.value}>
              {op.label}
            </Select.Item>
          ))}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  )
}

interface ComparisonOperatorSelectProps {
  value: 'eq' | 'neq'
  onValueChange: (value: 'eq' | 'neq') => void
  className?: string
}

function ComparisonOperatorSelect({ value, onValueChange, className }: ComparisonOperatorSelectProps) {
  return (
    <Select.Root items={COMPARISON_OPERATORS} value={value} onValueChange={onValueChange as (value: string) => void}>
      <Select.Trigger className={className}>
        <Select.Value />
      </Select.Trigger>
      <Select.Content align="start" alignItemWithTrigger={false}>
        <Select.Group>
          {COMPARISON_OPERATORS.map((op) => (
            <Select.Item key={op.value} value={op.value}>
              {op.label}
            </Select.Item>
          ))}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  )
}

interface ValueSelectProps {
  value: string | undefined
  onValueChange: (value: string) => void
  options: Array<{ id: string; label: string }>
  placeholder?: string
  className?: string
}

function ValueSelect({ value, onValueChange, options, placeholder = 'Select option...', className }: ValueSelectProps) {
  // If no options, render a text input
  if (options.length === 0) {
    return (
      <Input
        type="text"
        value={value ?? ''}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Enter value..."
        className={cn('min-w-0 flex-1', className)}
      />
    )
  }

  return (
    <Select.Root value={value ?? ''} onValueChange={onValueChange}>
      <Select.Trigger className={cn('min-w-0 flex-1', className)}>
        <Select.Value>
          {(selectedValue) => {
            if (!selectedValue) return placeholder
            const option = options.find((o) => o.id === selectedValue)
            return option?.label ?? selectedValue
          }}
        </Select.Value>
      </Select.Trigger>
      <Select.Content align="start" alignItemWithTrigger={false}>
        <Select.Group>
          {options.map((option) => (
            <Select.Item key={option.id} value={option.id}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  )
}

// =============================================================================
// Rule Component
// =============================================================================

function Rule({ action, inputBlocks, pages, currentPageId, onActionChange, onRemove }: RuleProps) {
  const condition = action.condition
  const currentPageIndex = pages.findIndex((p) => p.id === currentPageId)
  const availablePages = pages.filter((_, index) => index > currentPageIndex)

  // Get conditions array - either single condition or multiple from logical condition
  const conditions: ComparisonConditionType[] = isLogicalCondition(condition) ? condition.vars : [condition]

  const logicalOp = isLogicalCondition(condition) ? condition.op : 'and'

  const handleBlockChange = (index: number, blockId: string) => {
    const block = inputBlocks.find((b) => b.id === blockId)
    if (!block) return

    const currentCondition = conditions[index]
    const newCondition: ComparisonConditionType = {
      op: currentCondition?.op ?? 'eq',
      vars: [
        { type: 'block', value: blockId },
        { type: 'constant', value: '' },
      ],
    }

    if (isLogicalCondition(condition)) {
      const newVars = [...condition.vars]
      newVars[index] = newCondition
      onActionChange({
        ...action,
        condition: { ...condition, vars: newVars },
      })
    } else {
      onActionChange({
        ...action,
        condition: newCondition,
      })
    }
  }

  const handleOperatorChange = (index: number, op: 'eq' | 'neq') => {
    const currentCondition = conditions[index]
    if (!currentCondition || !('vars' in currentCondition)) return

    const newCondition: ComparisonConditionType = {
      op,
      vars: currentCondition.vars,
    }

    if (isLogicalCondition(condition)) {
      const newVars = [...condition.vars]
      newVars[index] = newCondition
      onActionChange({
        ...action,
        condition: { ...condition, vars: newVars },
      })
    } else {
      onActionChange({
        ...action,
        condition: newCondition,
      })
    }
  }

  const handleValueChange = (index: number, value: string) => {
    const currentCondition = conditions[index]
    if (!currentCondition || !('vars' in currentCondition)) return

    const newCondition: ComparisonConditionType = {
      op: currentCondition.op,
      vars: [currentCondition.vars[0] ?? { type: 'block', value: '' }, { type: 'constant', value }],
    }

    if (isLogicalCondition(condition)) {
      const newVars = [...condition.vars]
      newVars[index] = newCondition
      onActionChange({
        ...action,
        condition: { ...condition, vars: newVars },
      })
    } else {
      onActionChange({
        ...action,
        condition: newCondition,
      })
    }
  }

  const handleLogicalOpChange = (op: 'and' | 'or') => {
    if (isLogicalCondition(condition)) {
      onActionChange({
        ...action,
        condition: { ...condition, op },
      })
    }
  }

  const handleAddCondition = () => {
    const newCondition: ComparisonConditionType = { op: 'eq', vars: [] }

    if (isLogicalCondition(condition)) {
      onActionChange({
        ...action,
        condition: { ...condition, vars: [...condition.vars, newCondition] },
      })
    } else {
      // Convert to logical condition
      onActionChange({
        ...action,
        condition: { op: 'and', vars: [condition as ComparisonConditionType, newCondition] },
      })
    }
  }

  const handleRemoveCondition = (index: number) => {
    // If only one condition, remove the entire rule
    if (conditions.length === 1) {
      onRemove()
      return
    }

    if (isLogicalCondition(condition) && condition.vars.length > 2) {
      const newVars = condition.vars.filter((_, i) => i !== index)
      onActionChange({
        ...action,
        condition: { ...condition, vars: newVars },
      })
    } else if (isLogicalCondition(condition) && condition.vars.length === 2) {
      // Convert back to single condition
      const remainingCondition = condition.vars[index === 0 ? 1 : 0]
      if (remainingCondition) {
        onActionChange({
          ...action,
          condition: remainingCondition,
        })
      }
    }
  }

  const handlePageChange = (pageId: string) => {
    onActionChange({
      ...action,
      details: {
        ...action.details,
        to: { type: 'page', value: pageId },
      },
    })
  }

  const targetPageId = action.details.to?.value

  // Helper to get selected block and its options for a condition
  const getConditionData = (cond: ComparisonConditionType) => {
    if (!('vars' in cond)) return { blockId: undefined, block: undefined, options: [], value: undefined }
    const blockId = cond.vars[0]?.type === 'block' ? String(cond.vars[0].value) : undefined
    const block = inputBlocks.find((b) => b.id === blockId)
    const options = block ? getBlockOptions(block) : []
    const value = cond.vars[1]?.value != null ? String(cond.vars[1].value) : undefined
    return { blockId, block, options, value }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* If label */}
      <span className="text-xm font-medium">If</span>

      {/* Conditions */}
      {conditions.map((cond, index) => {
        const { blockId, options, value } = getConditionData(cond)
        return (
          <React.Fragment key={index}>
            {/* Logical operator between conditions */}
            {index > 0 && <LogicalOperatorSelect value={logicalOp} onValueChange={handleLogicalOpChange} />}

            {/* Condition row: [Block] [Operator] [Value] [Trash] */}
            <div className="flex min-w-0 items-center gap-1.5">
              <BlockSelect
                value={blockId}
                onValueChange={(newBlockId) => handleBlockChange(index, newBlockId)}
                blocks={inputBlocks}
              />
              <ComparisonOperatorSelect
                value={cond.op as 'eq' | 'neq'}
                onValueChange={(op) => handleOperatorChange(index, op)}
              />
              <ValueSelect value={value} onValueChange={(v) => handleValueChange(index, v)} options={options} />
              <Button size="icon" variant="ghost" onClick={() => handleRemoveCondition(index)}>
                <TrashIcon />
              </Button>
            </div>
          </React.Fragment>
        )
      })}

      {/* Add condition button */}
      <Button variant="secondary" className="w-full" onClick={handleAddCondition}>
        <PlusIcon />
        Add condition
      </Button>

      {/* Then go to label */}
      <span className="text-xm font-medium">Then go to</span>

      {/* Page selector */}
      <Select.Root value={targetPageId ?? ''} onValueChange={handlePageChange}>
        <Select.Trigger className="w-full">
          <Select.Value>
            {(value) => {
              if (!value) return 'Select...'
              const page = pages.find((p) => p.id === value)
              return page?.name || `Page ${pages.indexOf(page!) + 1}`
            }}
          </Select.Value>
        </Select.Trigger>
        <Select.Content align="start" alignItemWithTrigger={false}>
          <Select.Group>
            {availablePages.map((page) => (
              <Select.Item key={page.id} value={page.id}>
                {page.name || `Page ${pages.indexOf(page) + 1}`}
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </div>
  )
}

// =============================================================================
// LogicPanel Component
// =============================================================================

export function LogicPanel() {
  const { data: funnel, maybeSave } = useFunnel()
  const { selectedPage } = useFunnelEditor()

  const { pages, rules } = funnel
  const page = selectedPage!
  const pageRule = rules.find((r) => r.pageId === page.id)

  const inputBlocks = getAvailableInputBlocks(pages, page.id)
  const actions = pageRule?.actions ?? []
  const currentPageIndex = pages.findIndex((p) => p.id === page.id)
  const availablePages = pages.filter((_, index) => index > currentPageIndex)

  // Separate conditional rules from the default "always" fallback
  const conditionalActions = actions.filter((a) => a.condition.op !== 'always')
  const defaultAction = actions.find((a) => a.condition.op === 'always')
  const hasConditionalRules = conditionalActions.length > 0

  // Helper to update rules and trigger auto-save
  const updatePageRules = (newActions: RuleActionType[]) => {
    const updatedRules = pageRule
      ? rules.map((r) => (r.pageId === page.id ? { ...r, actions: newActions } : r))
      : [...rules, { pageId: page.id, actions: newActions }]
    maybeSave({ rules: updatedRules })
  }

  const handleActionChange = (index: number, newAction: RuleActionType) => {
    // Find the actual index in the full actions array
    const conditionalAction = conditionalActions[index]
    if (!conditionalAction) return
    const realIndex = actions.indexOf(conditionalAction)
    if (realIndex === -1) return

    const newActions = [...actions]
    newActions[realIndex] = newAction
    updatePageRules(newActions)
  }

  const handleActionRemove = (index: number) => {
    const conditionalAction = conditionalActions[index]
    if (!conditionalAction) return
    const newActions = actions.filter((a) => a !== conditionalAction)
    updatePageRules(newActions)
  }

  const handleAddRule = () => {
    const newAction: RuleActionType = {
      type: 'jump',
      condition: { op: 'eq', vars: [] },
      details: {},
    }
    // Insert before the default action if it exists
    if (defaultAction) {
      const defaultIndex = actions.indexOf(defaultAction)
      const newActions = [...actions]
      newActions.splice(defaultIndex, 0, newAction)
      updatePageRules(newActions)
    } else {
      updatePageRules([...actions, newAction])
    }
  }

  const handleDefaultPageChange = (pageId: string) => {
    const newDefaultAction: RuleActionType = {
      type: 'jump',
      condition: { op: 'always' },
      details: { to: { type: 'page', value: pageId } },
    }

    if (defaultAction) {
      // Replace existing default action
      const newActions = actions.map((a) => (a === defaultAction ? newDefaultAction : a))
      updatePageRules(newActions)
    } else {
      // Add new default action at the end
      updatePageRules([...actions, newDefaultAction])
    }
  }

  const handleDeleteAllRules = () => {
    updatePageRules([])
  }

  return (
    <Panel>
      <Pane.Root>
        <Pane.Header>
          <Pane.Title>{page.name || 'Page'} logic</Pane.Title>
          {actions.length > 0 && (
            <AlertDialog.Root>
              <AlertDialog.Trigger render={<Button size="icon" variant="ghost" />}>
                <TrashIcon />
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Header>
                  <AlertDialog.Title>Delete all rules?</AlertDialog.Title>
                  <AlertDialog.Description>
                    Are you sure you want to delete all rules for this page?
                  </AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                  <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                  <AlertDialog.Action variant="destructive" onClick={handleDeleteAllRules}>
                    Delete
                  </AlertDialog.Action>
                </AlertDialog.Footer>
              </AlertDialog.Content>
            </AlertDialog.Root>
          )}
        </Pane.Header>

        <Pane.Content className="gap-4 py-4">
          {conditionalActions.map((action, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Pane.Separator />}
              <Rule
                action={action}
                inputBlocks={inputBlocks}
                pages={pages}
                currentPageId={page.id}
                onActionChange={(newAction) => handleActionChange(index, newAction)}
                onRemove={() => handleActionRemove(index)}
              />
            </React.Fragment>
          ))}

          {hasConditionalRules && <Pane.Separator />}
          <Button variant="secondary" className="w-full" onClick={handleAddRule}>
            <PlusIcon />
            Add rule
          </Button>
          <Pane.Separator />
          <div className="flex flex-col gap-1.5">
            <span className="text-xm text-muted-foreground">
              {hasConditionalRules ? 'All other cases go to' : 'Always go to'}
            </span>
            <Select.Root value={defaultAction?.details.to?.value ?? ''} onValueChange={handleDefaultPageChange}>
              <Select.Trigger className="w-full">
                <Select.Value>
                  {(value) => {
                    if (!value) return 'Select...'
                    const targetPage = pages.find((p) => p.id === value)
                    return targetPage?.name || `Page ${pages.indexOf(targetPage!) + 1}`
                  }}
                </Select.Value>
              </Select.Trigger>
              <Select.Content align="start" alignItemWithTrigger={false}>
                <Select.Group>
                  {availablePages.map((p) => (
                    <Select.Item key={p.id} value={p.id}>
                      {p.name || `Page ${pages.indexOf(p) + 1}`}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
        </Pane.Content>
      </Pane.Root>
    </Panel>
  )
}
