import { Block } from '@/components/block'
import { NextButton } from '@/components/next-button'
import { cn } from '@/lib/utils'
import type {
  Block as BlockType,
  Condition,
  ConditionVar,
  Info as FunnelType,
  Rule,
  Theme as ThemeType,
  Variables,
} from '@shopfunnel/core/funnel/types'
import { IconLoader2 as LoaderIcon } from '@tabler/icons-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type Values = Record<string, unknown>

function evaluateCondition(condition: Condition, values: Values, variables: Variables) {
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

  function resolveVar(v: ConditionVar): unknown {
    if (v.type === 'constant') return v.value
    if (v.type === 'variable') return variables[v.value as string]
    if (v.type === 'block') return values[v.value as string]
    return v.value
  }

  switch (condition.op) {
    case 'always':
      return true
    case 'and':
      return (condition as { vars: Condition[] }).vars.every((c) => evaluateCondition(c, values, variables))
    case 'or':
      return (condition as { vars: Condition[] }).vars.some((c) => evaluateCondition(c, values, variables))
    default: {
      if (!('vars' in condition) || condition.vars.length < 2) return false
      return compare(condition.op, resolveVar(condition.vars[0]!), resolveVar(condition.vars[1]!))
    }
  }
}

function evaluateRule(rule: Rule, values: Values, variables: Variables) {
  const mathOps: Record<string, (a: number, b: number) => number> = {
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide: (a, b) => (b !== 0 ? a / b : a),
    set: (_, b) => b,
  }

  let nextPageId: string | undefined
  const hiddenBlockIds = new Set<string>()
  let updatedVariables = { ...variables }
  let jumpFound = false

  for (const action of rule.actions) {
    if (!evaluateCondition(action.condition, values, updatedVariables)) continue

    switch (action.type) {
      case 'jump':
        if (!jumpFound && action.details.to?.value) {
          nextPageId = action.details.to.value
          jumpFound = true
        }
        break

      case 'hide':
        if (action.details.target?.type === 'block') {
          hiddenBlockIds.add(action.details.target.value)
        }
        break

      default: {
        const op = mathOps[action.type]
        if (!op || action.details.target?.type !== 'variable' || !action.details.value) break

        const variableName = action.details.target.value
        const currentValue = Number(updatedVariables[variableName]) || 0
        const operand =
          action.details.value.type === 'variable'
            ? Number(updatedVariables[action.details.value.value]) || 0
            : action.details.value.value

        updatedVariables = { ...updatedVariables, [variableName]: op(currentValue, operand) }
      }
    }
  }

  return { nextPageId, hiddenBlockIds, variables: updatedVariables }
}

function validateBlocks(blocks: BlockType[], values: Values) {
  const validators: Record<string, (value: unknown, param: unknown) => string | null> = {
    required: (value) => {
      const empty =
        value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
      return empty ? 'Required' : null
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
  for (const block of blocks) {
    if (!('validations' in block)) continue

    for (const [key, value] of Object.entries(block.validations)) {
      if (value === false || value === undefined) continue

      const validator = validators[key]
      if (!validator) continue

      const error = validator(values[block.id], value)
      if (error) errors[block.id] = error
    }
  }
  if (Object.keys(errors).length === 0) {
    return null
  }
  return errors
}

function resolveBlocks(blocks: BlockType[], values: Values, variables: Variables): BlockType[] {
  function resolveTemplate(template: string): string {
    return template.replace(/\{\{(var|block):([^}]+)\}\}/g, (_, type: string, key: string) => {
      const value = type === 'var' ? variables[key.trim()] : values[key.trim()]
      if (value === undefined || value === null) return ''
      if (Array.isArray(value)) return value.join(', ')
      return String(value)
    })
  }

  function resolveValue(value: unknown): unknown {
    if (typeof value === 'string') return resolveTemplate(value)
    if (Array.isArray(value)) return value.map(resolveValue)
    if (value !== null && typeof value === 'object') {
      const resolved: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        resolved[k] = resolveValue(v)
      }
      return resolved
    }
    return value
  }

  return blocks.map((block) => resolveValue(block) as BlockType)
}

export function shouldAutoAdvance(blocks: BlockType[]): boolean {
  const isInputBlock = (block: BlockType) =>
    block.type === 'text_input' ||
    block.type === 'multiple_choice' ||
    block.type === 'dropdown' ||
    block.type === 'picture_choice'

  const advancesAutomatically = (block: BlockType) =>
    block.type === 'loader' ||
    block.type === 'dropdown' ||
    (block.type === 'multiple_choice' && !block.properties.multiple) ||
    (block.type === 'picture_choice' && !block.properties.multiple)

  const inputBlockCount = blocks.filter(isInputBlock).length
  if (inputBlockCount > 1) return false

  return blocks.some(advancesAutomatically)
}

export function FunnelStyle({ theme }: { theme: ThemeType }) {
  return (
    <style>{`:root {
    --sf-radius: ${theme.radius};
    --sf-primary: ${theme.colors.primary};
    --sf-primary-foreground: ${theme.colors.primaryForeground};
    --sf-muted: #F5F5F5;
    --sf-muted-foreground: #737373;
    --sf-background: #FFFFFF;
    --sf-foreground: #0A0A0A;
    --sf-border: #E5E5E5;
    --sf-ring: #A1A1A1;
  }`}</style>
  )
}

export interface FunnelProps {
  funnel: FunnelType
  mode?: 'preview' | 'live'
  onPageChange?: (page: { id: string; index: number; name: string }) => void
  onPageComplete?: (page: { id: string; index: number; name: string; values: Values }) => void
  onComplete?: (values: Values) => Promise<void> | void
}

export function Funnel({ funnel, mode = 'live', onComplete, onPageChange, onPageComplete }: FunnelProps) {
  const VALUES_STORAGE_KEY = `sf_funnel_${funnel.id}_values`

  const canChangePageRef = useRef(true)
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [redirecting, setRedirecting] = useState(false)

  const [values, setValues] = useState<Record<string, unknown>>({})
  const [loadingValues, setLoadingValues] = useState<Record<string, boolean>>({})

  const [variables, setVariables] = useState<Variables>(funnel.variables ?? {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hiddenBlockIds, setHiddenBlockIds] = useState<Set<string>>(new Set())

  const currentPage = funnel.pages[currentPageIndex]

  const visibleBlocks = useMemo(
    () => currentPage?.blocks.filter((block) => !hiddenBlockIds.has(block.id)) ?? [],
    [currentPage?.blocks, hiddenBlockIds],
  )
  const resolvedBlocks = useMemo(
    () => resolveBlocks(visibleBlocks, values, variables),
    [visibleBlocks, values, variables],
  )

  const showLegalDisclaimer = currentPageIndex === 0 && funnel.settings.privacyUrl && funnel.settings.termsUrl
  const showNextButton = !shouldAutoAdvance(visibleBlocks)

  useEffect(() => {
    if (mode === 'preview') return
    try {
      const storedValues = localStorage.getItem(VALUES_STORAGE_KEY)
      if (!storedValues) return
      const values = JSON.parse(storedValues)
      setValues(values)
    } catch {
      // noop
    }
  }, [VALUES_STORAGE_KEY, mode])

  useEffect(() => {
    if (!currentPage) return
    onPageChange?.({
      id: currentPage.id,
      index: currentPageIndex,
      name: currentPage.name,
    })
  }, [currentPage, currentPageIndex])

  const handleBlockValueChange = (blockId: string, value: unknown) => {
    const newValues = { ...values, [blockId]: value }
    setValues(newValues)
    try {
      localStorage.setItem(VALUES_STORAGE_KEY, JSON.stringify(newValues))
    } catch {
      // noop
    }
    if (shouldAutoAdvance(visibleBlocks)) {
      next(newValues)
    }
  }

  const handleBlockLoadingValueChange = (blockId: string, value: boolean) => {
    const newLoadingValues = { ...loadingValues, [blockId]: value }
    setLoadingValues(newLoadingValues)
    if (shouldAutoAdvance(visibleBlocks)) {
      if (Object.values(newLoadingValues).every((value) => !value)) {
        next(values)
      }
    }
  }

  const handlePageChangeComplete = () => {
    if (redirecting) return
    canChangePageRef.current = true
  }

  async function next(values: Values) {
    if (!currentPage) return
    if (!canChangePageRef.current) return

    canChangePageRef.current = false

    const errors = validateBlocks(visibleBlocks, values)
    setErrors(errors ?? {})
    if (errors) {
      canChangePageRef.current = true
      return
    }

    let nextPageIndex = currentPageIndex + 1
    let nextHiddenBlockIds = new Set<string>()
    let nextVariables = variables

    const currentPageRule = funnel.rules.find((rule) => rule.pageId === currentPage.id)
    if (currentPageRule) {
      const result = evaluateRule(currentPageRule, values, variables)
      nextHiddenBlockIds = result.hiddenBlockIds
      nextVariables = result.variables

      if (result.nextPageId) {
        const index = funnel.pages.findIndex((page) => page.id === result.nextPageId)
        if (index !== -1) nextPageIndex = index
      }
    }

    const currentPageValues = (() => {
      const currentBlockIds = currentPage.blocks.map((b) => b.id)
      return currentBlockIds.reduce<Values>((acc, blockId) => {
        if (values[blockId] !== undefined) acc[blockId] = values[blockId]
        return acc
      }, {})
    })()

    onPageComplete?.({
      id: currentPage!.id,
      index: currentPageIndex,
      name: currentPage!.name,
      values: currentPageValues,
    })

    const redirectUrl = currentPage.properties.redirectUrl
    if (redirectUrl) {
      setRedirecting(true)
      localStorage.removeItem(VALUES_STORAGE_KEY)
      await Promise.all([new Promise((resolve) => setTimeout(resolve, 2000)), onComplete?.(values)])
      window.location.href = redirectUrl
    } else {
      setCurrentPageIndex(nextPageIndex)
      setHiddenBlockIds(nextHiddenBlockIds)
      setVariables(nextVariables)

      if (nextPageIndex >= funnel.pages.length) {
        try {
          localStorage.removeItem(VALUES_STORAGE_KEY)
        } catch {
          // noop
        }
        await onComplete?.(values)
      }
    }
  }

  return (
    <>
      <FunnelStyle theme={funnel.theme} />
      <div className="relative flex min-h-dvh flex-col bg-(--sf-background) px-6">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
          <div className="flex h-16 w-full items-center justify-center">
            {funnel.theme.logo ? (
              <img src={funnel.theme.logo} alt="Logo" className="h-9 w-auto object-contain" />
            ) : (
              <span className="text-xl font-bold text-(--sf-foreground)">{funnel.title}</span>
            )}
          </div>
          <div className="h-1.5 w-full rounded-(--sf-radius) bg-(--sf-muted)">
            <motion.div
              className="h-full rounded-(--sf-radius) bg-(--sf-primary)"
              initial={{ width: 0 }}
              animate={{ width: `${(currentPageIndex / funnel.pages.length) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <AnimatePresence initial={false} mode="wait" onExitComplete={handlePageChangeComplete}>
            <motion.div
              key={`page-${currentPageIndex}`}
              className="flex flex-1 flex-col"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {currentPage && (
                <>
                  <div className="flex-1 py-6">
                    {resolvedBlocks.map((block, index) => (
                      <div key={block.id}>
                        <Block
                          block={block}
                          index={index}
                          variant={funnel.theme.style}
                          value={values[block.id]}
                          onValueChange={(value) => handleBlockValueChange(block.id, value)}
                          onLoadingValueChange={(value) => handleBlockLoadingValueChange(block.id, value)}
                        />
                        {errors[block.id] && (
                          <span className="mt-2 block text-sm text-red-500">{errors[block.id]}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {showNextButton && (
                    <div className="sticky bottom-0 pb-6">
                      <NextButton onClick={() => next(values)}>{currentPage.properties.buttonText}</NextButton>
                    </div>
                  )}
                  {showLegalDisclaimer && (
                    <div
                      className={cn(
                        'py-3 text-center text-[0.625rem] text-balance text-(--sf-muted-foreground)',
                        showNextButton && 'z-1 -mt-3 pt-0',
                      )}
                    >
                      By clicking any of the options above, you agree with the{' '}
                      <a
                        className="underline"
                        href={funnel.settings.termsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Terms of Use
                      </a>{' '}
                      and{' '}
                      <a
                        className="underline"
                        href={funnel.settings.privacyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Privacy Policy
                      </a>
                      .
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {redirecting &&
        createPortal(
          <div className="fixed inset-0 z-50 flex animate-in flex-col items-center justify-center gap-0.5 bg-(--sf-background)/70 duration-500 fade-in supports-backdrop-filter:backdrop-blur-sm">
            <LoaderIcon className="size-4.5 animate-spin text-(--sf-foreground)" />
            <div className="text-sm text-(--sf-foreground)">Please wait...</div>
          </div>,
          document.body,
        )}
    </>
  )
}
