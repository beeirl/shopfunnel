import { Block } from '@/components/block'
import { NextButton } from '@/components/next-button'
import type {
  Block as BlockType,
  ComparisonCondition,
  Condition,
  Info as QuizType,
  Rule,
  Theme as ThemeType,
  Variables,
} from '@shopfunnel/core/quiz/types'
import { useDebouncedCallback } from '@tanstack/react-pacer'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'

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

  function resolveVar(v: ComparisonCondition['vars'][number]): unknown {
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
      const compCondition = condition as ComparisonCondition
      if (compCondition.vars.length < 2) return false
      return compare(compCondition.op, resolveVar(compCondition.vars[0]!), resolveVar(compCondition.vars[1]!))
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

  let nextStepId: string | undefined
  const hiddenBlockIds = new Set<string>()
  let updatedVariables = { ...variables }

  for (const action of rule.actions) {
    if (!evaluateCondition(action.condition, values, updatedVariables)) continue

    switch (action.type) {
      case 'jump':
        if (action.details.to?.value) {
          nextStepId = action.details.to.value
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

  return { nextStepId, hiddenBlockIds, variables: updatedVariables }
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

export function getThemeCssVars(theme: ThemeType) {
  return {
    '--radius': theme.radius.value,
    '--primary': theme.colors.primary,
    '--primary-foreground': theme.colors.primaryForeground,
    '--muted': '#F5F5F5',
    '--muted-foreground': '#737373',
    '--background': '#FFFFFF',
    '--foreground': '#0A0A0A',
    '--border': '#E5E5E5',
    '--ring': '#A1A1A1',
  } as React.CSSProperties
}

export interface QuizProps {
  quiz: QuizType
  mode?: 'preview' | 'live'
  onComplete?: (values: Values) => void
  onStepChange?: (step: { id: string; index: number; name: string }) => void
  onStepComplete?: (step: { id: string; index: number; name: string; values: Values }) => void
}

export function Quiz({ quiz, mode = 'live', onComplete, onStepChange, onStepComplete }: QuizProps) {
  const VALUES_STORAGE_KEY = `sf_quiz_${quiz.id}_values`

  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const [values, setValues] = useState<Record<string, unknown>>({})
  const [loadingValues, setLoadingValues] = useState<Record<string, boolean>>({})

  const [variables, setVariables] = useState<Variables>(quiz.variables ?? {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hiddenBlockIds, setHiddenBlockIds] = useState<Set<string>>(new Set())

  const [completed, setCompleted] = useState(false)

  const currentStep = quiz.steps[currentStepIndex]

  const visibleBlocks = useMemo(
    () => currentStep?.blocks.filter((block) => !hiddenBlockIds.has(block.id)) ?? [],
    [currentStep?.blocks, hiddenBlockIds],
  )
  const resolvedBlocks = useMemo(
    () => resolveBlocks(visibleBlocks, values, variables),
    [visibleBlocks, values, variables],
  )

  const persistValues = useDebouncedCallback(
    (values: Values) => {
      if (mode === 'preview') return
      if (completed) return
      localStorage.setItem(VALUES_STORAGE_KEY, JSON.stringify(values))
    },
    { wait: 300 },
  )

  useEffect(() => {
    if (mode === 'preview') return

    const storedValues = localStorage.getItem(VALUES_STORAGE_KEY)
    if (!storedValues) return

    try {
      const parsedValues = JSON.parse(storedValues)
      setValues(parsedValues)
    } catch {
      // Invalid stored data, ignore
    }
  }, [VALUES_STORAGE_KEY, mode])

  useEffect(() => {
    const step = quiz.steps[currentStepIndex]
    if (!step) return
    onStepChange?.({ id: step.id, index: currentStepIndex, name: step.name })
  }, [currentStepIndex, quiz.steps, onStepChange])

  const handleBlockValueChange = (blockId: string, value: unknown) => {
    const newValues = { ...values, [blockId]: value }
    setValues(newValues)
    persistValues(newValues)
    if (shouldAutoAdvance(visibleBlocks)) {
      next(newValues)
    }
  }

  const handleBlockLoadingValueChange = (blockId: string, value: boolean) => {
    const newLoadingValues = { ...loadingValues, [blockId]: value }
    setLoadingValues(newLoadingValues)
    if (shouldAutoAdvance(visibleBlocks)) {
      if (Object.values(newLoadingValues).every((value) => value)) {
        next(values)
      }
    }
  }

  function next(values: Values) {
    if (!currentStep) return

    const errors = validateBlocks(visibleBlocks, values)
    setErrors(errors ?? {})
    if (errors) return

    let nextStepIndex = currentStepIndex + 1
    let nextHiddenBlockIds = new Set<string>()
    let nextVariables = variables

    const currentStepRule = quiz.rules.find((rule) => rule.stepId === currentStep.id)
    if (currentStepRule) {
      const result = evaluateRule(currentStepRule, values, variables)
      nextHiddenBlockIds = result.hiddenBlockIds
      nextVariables = result.variables

      if (result.nextStepId) {
        const index = quiz.steps.findIndex((step) => step.id === result.nextStepId)
        if (index !== -1) nextStepIndex = index
      }
    }

    const currentStepValues = (() => {
      const currentBlockIds = currentStep.blocks.map((b) => b.id)
      return currentBlockIds.reduce<Values>((currentStepValues, blockId) => {
        if (values[blockId] !== undefined) {
          currentStepValues[blockId] = values[blockId]
        }
        return currentStepValues
      }, {})
    })()

    onStepComplete?.({
      id: currentStep.id,
      index: currentStepIndex,
      name: currentStep.name,
      values: currentStepValues,
    })

    if (nextStepIndex >= quiz.steps.length) {
      setValues({})
      setLoadingValues({})
      localStorage.removeItem(VALUES_STORAGE_KEY)
      setCompleted(true)
      onComplete?.(values)
      return
    }

    setCurrentStepIndex(nextStepIndex)
    setHiddenBlockIds(nextHiddenBlockIds)
    setVariables(nextVariables)
  }

  if (!currentStep) return null

  return (
    <div className="relative flex min-h-dvh flex-col bg-background px-6" style={getThemeCssVars(quiz.theme)}>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        {quiz.theme.logo && (
          <div className="flex h-auto w-full justify-center py-4">
            <img src={quiz.theme.logo} alt="Logo" className="h-9 w-auto object-contain" />
          </div>
        )}
        <div className="h-1.5 w-full rounded-(--radius) bg-muted">
          <motion.div
            className="h-full rounded-(--radius) bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / quiz.steps.length) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={completed ? 'completed' : currentStep.id}
            className="flex flex-1 flex-col"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {!completed && (
              <>
                <div className="pt-8">
                  {resolvedBlocks.map((block, index) => (
                    <div key={block.id}>
                      <Block
                        block={block}
                        index={index}
                        value={values[block.id]}
                        onValueChange={(value) => handleBlockValueChange(block.id, value)}
                        onLoadingValueChange={(value) => handleBlockLoadingValueChange(block.id, value)}
                      />
                      {errors[block.id] && <span className="mt-2 block text-sm text-red-500">{errors[block.id]}</span>}
                    </div>
                  ))}
                </div>
                {!shouldAutoAdvance(visibleBlocks) && (
                  <div className="sticky bottom-0 mt-auto w-full pt-4 pb-5">
                    <NextButton onClick={() => next(values)}>{currentStep.properties.buttonText}</NextButton>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
