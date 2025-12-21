import { Block as BlockComponent } from '@/form/block'
import { Button } from '@/form/components/button'
import { Form as BaseForm } from '@base-ui/react'
import { Form as FormModule } from '@shopfunnel/core/form/index'
import type { Block, ComparisonCondition, Condition, InputBlock, Page, Variables } from '@shopfunnel/core/form/schema'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'

// ============================================
// Types
// ============================================

interface State {
  currentPageIndex: number
  variables: Variables
  values: Record<string, unknown>
}

interface CurrentPage {
  id: string
  blocks: Block[]
  values: Record<string, unknown>
  errors: Record<string, string>
  autoAdvance: boolean
}

interface HistoryEntry {
  pageIndex: number
  variables: Variables
}

interface RuleEvaluationResult {
  jumpTo: string | undefined
  hiddenBlockIds: Set<string>
  variables: Variables
}

// ============================================
// Form Component
// ============================================

export function Form({ form, mode = 'live' }: { form: FormModule.Info; mode?: 'preview' | 'live' }) {
  const storageKey = `form-${form.id}-values`

  const stateRef = React.useRef<State>({
    currentPageIndex: 0,
    values: {},
    variables: form.schema.variables ?? {},
  })

  const historyRef = React.useRef<HistoryEntry[]>([])

  const [currentPage, setCurrentPage] = React.useState<CurrentPage | undefined>(() => {
    const page = form.schema.pages[stateRef.current.currentPageIndex]
    if (!page) return undefined

    const evaluation = evaluatePageRules(page.id, form, stateRef.current)
    return buildPage(page, stateRef.current, evaluation)
  })

  React.useEffect(() => {
    const storedValues = localStorage.getItem(storageKey)
    if (!storedValues) return

    try {
      const values = JSON.parse(storedValues)
      stateRef.current = { ...stateRef.current, values }

      // Re-render with restored values
      const currentPageSchema = form.schema.pages[stateRef.current.currentPageIndex]
      if (currentPageSchema) {
        const currentPageEvaluation = evaluatePageRules(currentPageSchema.id, form, stateRef.current)
        setCurrentPage(buildPage(currentPageSchema, stateRef.current, currentPageEvaluation))
      }
    } catch {
      // Invalid stored data, ignore
    }
  }, [storageKey, form])

  function setValue(blockId: string, value: unknown) {
    const currentPageSchema = form.schema.pages[stateRef.current.currentPageIndex]
    if (!currentPageSchema) return

    // Update state
    stateRef.current = {
      ...stateRef.current,
      values: { ...stateRef.current.values, [blockId]: value },
    }
    localStorage.setItem(storageKey, JSON.stringify(stateRef.current.values))

    // Re-evaluate rules with updated values
    const currentPageEvaluation = evaluatePageRules(currentPageSchema.id, form, stateRef.current)
    stateRef.current = { ...stateRef.current, variables: currentPageEvaluation.variables }

    // Update page view, clearing error for changed field
    setCurrentPage((prevCurrentPage) => {
      const currentPage = buildPage(currentPageSchema, stateRef.current, currentPageEvaluation, prevCurrentPage?.errors)
      delete currentPage.errors[blockId]
      return { ...currentPage, errors: currentPage.errors }
    })

    // Auto-advance if applicable
    const updatedCurrentPage = buildPage(currentPageSchema, stateRef.current, currentPageEvaluation)
    if (updatedCurrentPage.autoAdvance) next()
  }

  function next() {
    const currentPageSchema = form.schema.pages[stateRef.current.currentPageIndex]
    if (!currentPageSchema) return

    // Validate current page
    const errors = validatePage(currentPageSchema, stateRef.current)
    if (Object.keys(errors).length > 0) {
      setCurrentPage((prev) => (prev ? { ...prev, errors } : prev))
      return
    }

    // Save current page index and variables (before rule evaluation) for back navigation
    historyRef.current = [
      ...historyRef.current,
      { pageIndex: stateRef.current.currentPageIndex, variables: { ...stateRef.current.variables } },
    ]

    // Evaluate rules to determine next page
    const currentPageEvaluation = evaluatePageRules(currentPageSchema.id, form, stateRef.current)
    stateRef.current = { ...stateRef.current, variables: currentPageEvaluation.variables }

    // Resolve next page index based on jump rules or sequential order
    const nextIndex = (() => {
      if (currentPageEvaluation.jumpTo) {
        const jumpIndex = form.schema.pages.findIndex((page) => page.id === currentPageEvaluation.jumpTo)
        if (jumpIndex !== -1) return jumpIndex
      }
      if (stateRef.current.currentPageIndex >= form.schema.pages.length - 1) return -1
      return stateRef.current.currentPageIndex + 1
    })()
    if (nextIndex === -1) return

    const nextPageSchema = form.schema.pages[nextIndex]
    if (!nextPageSchema) return

    // Update page index and render next page
    stateRef.current = { ...stateRef.current, currentPageIndex: nextIndex }

    // Evaluate rules for the new page to handle any initial hidden blocks
    const nextPageEvaluation = evaluatePageRules(nextPageSchema.id, form, stateRef.current)
    setCurrentPage(buildPage(nextPageSchema, stateRef.current, nextPageEvaluation))
  }

  function prev() {
    if (historyRef.current.length === 0) return

    // Pop the previous page state from history
    const prevHistoryEntry = historyRef.current[historyRef.current.length - 1]!
    historyRef.current = historyRef.current.slice(0, -1)

    // Restore page index and variables (before rules were applied)
    stateRef.current = {
      ...stateRef.current,
      currentPageIndex: prevHistoryEntry.pageIndex,
      variables: { ...prevHistoryEntry.variables },
    }

    // Get the previous page schema and evaluate rules for hidden blocks (but don't apply math ops to state)
    const prevPageSchema = form.schema.pages[prevHistoryEntry.pageIndex]
    if (!prevPageSchema) return

    const prevPageEvaluation = evaluatePageRules(prevPageSchema.id, form, stateRef.current)
    setCurrentPage(buildPage(prevPageSchema, stateRef.current, prevPageEvaluation))
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage?.id}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {currentPage && (
          <div className="flex w-full flex-col gap-y-6">
            <BaseForm className="flex flex-col gap-y-4" errors={currentPage.errors}>
              {currentPage.blocks.map((block) => (
                <BlockComponent
                  key={block.id}
                  mode="live"
                  schema={block}
                  value={currentPage.values?.[block.id]}
                  onChange={(value) => setValue?.(block.id, value)}
                />
              ))}
            </BaseForm>
            {!currentPage.autoAdvance && <Button onClick={next}>Next</Button>}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================
// Helper Functions
// ============================================

const INPUT_BLOCK_TYPES = ['short_text', 'multiple_choice', 'dropdown', 'slider'] as const

export function isInputBlock(block: Block): block is InputBlock {
  return INPUT_BLOCK_TYPES.includes(block.type as (typeof INPUT_BLOCK_TYPES)[number])
}

const evaluateCondition = (condition: Condition, state: State): boolean => {
  function compare(op: string, left: unknown, right: unknown) {
    if (op === 'eq' && Array.isArray(left)) return left.includes(right as string)
    if (op === 'eq' && Array.isArray(right)) return right.includes(left as string)
    if (op === 'neq' && Array.isArray(left)) return !left.includes(right as string)
    if (op === 'neq' && Array.isArray(right)) return !right.includes(left as string)

    function normalize(val: unknown): string | number {
      if (val === null || val === undefined) return ''
      if (typeof val === 'number') return val
      if (Array.isArray(val)) return val.join(',')
      const num = Number(val)
      return isNaN(num) ? String(val) : num
    }

    const l = normalize(left)
    const r = normalize(right)
    switch (op) {
      case 'eq':
        return l === r
      case 'neq':
        return l !== r
      case 'lt':
        return l < r
      case 'lte':
        return l <= r
      case 'gt':
        return l > r
      case 'gte':
        return l >= r
      default:
        return false
    }
  }

  function resolveVar(v: ComparisonCondition['vars'][number]): unknown {
    if (v.type === 'constant') return v.value
    if (v.type === 'variable') return state.variables[v.value as string]
    if (v.type === 'block') return state.values[v.value as string]
    return v.value
  }

  switch (condition.op) {
    case 'always':
      return true
    case 'and':
      return (condition as { vars: Condition[] }).vars.every((c) => evaluateCondition(c, state))
    case 'or':
      return (condition as { vars: Condition[] }).vars.some((c) => evaluateCondition(c, state))
    default: {
      const compCondition = condition as ComparisonCondition
      if (compCondition.vars.length < 2) return false
      return compare(compCondition.op, resolveVar(compCondition.vars[0]!), resolveVar(compCondition.vars[1]!))
    }
  }
}

const evaluatePageRules = (pageId: string, formData: FormModule.Info, state: State): RuleEvaluationResult => {
  let jumpTo: string | undefined
  const hiddenBlockIds = new Set<string>()
  let variables = { ...state.variables }

  const rules = formData.schema.rules.find((rule) => rule.pageId === pageId)
  if (!rules) return { jumpTo, hiddenBlockIds, variables }

  const mathOps: Record<string, (a: number, b: number) => number> = {
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide: (a, b) => (b !== 0 ? a / b : a),
    set: (_, b) => b,
  }

  for (const action of rules.actions) {
    if (!evaluateCondition(action.condition, state)) continue

    switch (action.type) {
      case 'jump':
        if (action.details.to?.value) {
          jumpTo = action.details.to.value
        }
        break

      case 'hide':
        if (action.details.target?.type === 'block') {
          hiddenBlockIds.add(action.details.target.value)
        }
        break

      default: {
        // Math operations (add, subtract, multiply, divide, set)
        const op = mathOps[action.type]
        if (!op || action.details.target?.type !== 'variable' || !action.details.value) break

        const variableName = action.details.target.value
        const currentValue = Number(variables[variableName]) || 0
        const operand =
          action.details.value.type === 'variable'
            ? Number(variables[action.details.value.value]) || 0
            : action.details.value.value

        variables = { ...variables, [variableName]: op(currentValue, operand) }
      }
    }
  }

  return { jumpTo, hiddenBlockIds, variables }
}

const resolveTemplates = (value: unknown, state: State): unknown => {
  function resolveTemplate(template: string) {
    return template.replace(/\{\{(var|block):([^}]+)\}\}/g, (_, type: string, key: string) => {
      const value = type === 'var' ? state.variables[key.trim()] : state.values[key.trim()]
      if (value === undefined || value === null) return ''
      if (Array.isArray(value)) return value.join(', ')
      return String(value)
    })
  }

  if (typeof value === 'string') return resolveTemplate(value)
  if (Array.isArray(value)) return value.map((item) => resolveTemplates(item, state))
  if (value !== null && typeof value === 'object') {
    const resolved: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = resolveTemplates(v, state)
    }
    return resolved
  }
  return value
}

const validatePage = (page: Page, state: State) => {
  const validators: Record<string, (value: unknown, param: unknown) => string | null> = {
    required: (value) => {
      const empty =
        value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
      return empty ? 'Required' : null
    },
    email: (value) => {
      if (!value) return null
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) ? null : 'Invalid email'
    },
    minLength: (value, min) => {
      if (!value) return null
      return String(value).length >= (min as number) ? null : `Min ${min} characters`
    },
    maxLength: (value, max) => {
      if (!value) return null
      return String(value).length <= (max as number) ? null : `Max ${max} characters`
    },
    minChoices: (value, min) => {
      const count = Array.isArray(value) ? value.length : value ? 1 : 0
      return count >= (min as number) ? null : `Select at least ${min}`
    },
    maxChoices: (value, max) => {
      const count = Array.isArray(value) ? value.length : value ? 1 : 0
      return count <= (max as number) ? null : `Select at most ${max}`
    },
    min: (value, min) => {
      if (value === undefined || value === null) return null
      return Number(value) >= (min as number) ? null : `Min ${min}`
    },
    max: (value, max) => {
      if (value === undefined || value === null) return null
      return Number(value) <= (max as number) ? null : `Max ${max}`
    },
    pattern: (value, pattern) => {
      if (!value) return null
      return new RegExp(pattern as string).test(String(value)) ? null : 'Invalid format'
    },
  }

  const errors: Record<string, string> = {}
  for (const block of page.blocks) {
    if (!isInputBlock(block)) continue
    if (!('validations' in block)) continue

    for (const [rule, param] of Object.entries(block.validations)) {
      if (param === false || param === undefined) continue
      const validator = validators[rule]
      if (!validator) continue
      const error = validator(state.values[block.id], param)
      if (error) {
        errors[block.id] = error
        break
      }
    }
  }
  return errors
}

function buildPage(
  schema: Page,
  state: State,
  evaluation: RuleEvaluationResult,
  errors: Record<string, string> = {},
): CurrentPage {
  const blocks = schema.blocks
    .filter((block) => !evaluation.hiddenBlockIds.has(block.id))
    .map((block) => resolveTemplates(block, state) as Block)
  const blockIds = new Set(blocks.map((block) => block.id))
  const values = Object.fromEntries(Object.entries(state.values).filter(([key]) => blockIds.has(key)))
  const autoAdvance = (() => {
    const inputBlocks = blocks.filter(isInputBlock)
    if (inputBlocks.length === 0) return false
    return inputBlocks.every((block) => {
      if (block.type === 'dropdown') return true
      if (block.type === 'multiple_choice' && !block.properties.multiple) return true
      return false
    })
  })()
  return {
    id: schema.id,
    blocks,
    values,
    errors,
    autoAdvance,
  }
}
