import { ulid } from 'ulid'
import type { Block, ComparisonCondition, Condition, ConditionVar, Page, Rule } from './types'

export namespace FunnelClone {
  export function cloneBlock(block: Block, generateId: (oldId: string) => string = () => ulid()): Block {
    const cloned = { ...block, id: generateId(block.id) }
    if ('options' in cloned.properties) {
      const typed = cloned as Extract<Block, { properties: { options: unknown[] } }>
      return {
        ...typed,
        properties: {
          ...typed.properties,
          options: typed.properties.options.map((option) => ({ ...option, id: generateId(option.id) })),
        },
      } as Block
    }
    return cloned
  }

  export function clonePage(page: Page, generateId: (oldId: string) => string = () => ulid()): Page {
    return {
      ...page,
      id: generateId(page.id),
      blocks: page.blocks.map((block) => cloneBlock(block, generateId)),
    }
  }

  export function clone(
    data: { pages: Page[]; rules: Rule[] },
    generateId: (oldId: string) => string = () => ulid(),
  ): { pages: Page[]; rules: Rule[] } {
    const idMap = new Map<string, string>()

    const getOrCreate = (oldId: string) => {
      const existing = idMap.get(oldId)
      if (existing) return existing
      const newId = generateId(oldId)
      idMap.set(oldId, newId)
      return newId
    }

    // Pass 1: collect and assign new IDs for all pages, blocks, and options
    for (const page of data.pages) {
      getOrCreate(page.id)
      for (const block of page.blocks) {
        getOrCreate(block.id)
        if ('options' in block.properties) {
          for (const option of (block as Extract<Block, { properties: { options: unknown[] } }>).properties.options) {
            getOrCreate(option.id)
          }
        }
      }
    }

    // Pass 2: replace IDs in pages
    const pages = data.pages.map((page) => ({
      ...page,
      id: idMap.get(page.id)!,
      blocks: page.blocks.map((block) => {
        const updated = { ...block, id: idMap.get(block.id)! }
        if ('options' in updated.properties) {
          const typed = updated as Extract<Block, { properties: { options: unknown[] } }>
          return {
            ...typed,
            properties: {
              ...typed.properties,
              options: typed.properties.options.map((option) => ({
                ...option,
                id: idMap.get(option.id)!,
              })),
            },
          } as Block
        }
        return updated
      }),
    }))

    // Pass 3: remap references in rules
    const remapComparison = (condition: ComparisonCondition): ComparisonCondition => {
      if (condition.op === 'always') return condition
      const vars = condition.vars.map((v): ConditionVar => {
        if (v.type === 'block' && typeof v.value === 'string' && idMap.has(v.value)) {
          return { ...v, value: idMap.get(v.value)! }
        }
        if (v.type === 'constant' && typeof v.value === 'string' && idMap.has(v.value)) {
          return { ...v, value: idMap.get(v.value)! }
        }
        return v
      })
      return { ...condition, vars }
    }

    const remapCondition = (condition: Condition): Condition => {
      if ('op' in condition && (condition.op === 'and' || condition.op === 'or')) {
        return { ...condition, vars: condition.vars.map(remapComparison) }
      }
      return remapComparison(condition as ComparisonCondition)
    }

    const rules = data.rules.map((rule) => ({
      ...rule,
      pageId: idMap.get(rule.pageId) ?? rule.pageId,
      actions: rule.actions.map((action) => ({
        ...action,
        condition: remapCondition(action.condition),
        details: {
          ...action.details,
          ...(action.details.to && {
            to: {
              ...action.details.to,
              value: idMap.get(action.details.to.value) ?? action.details.to.value,
            },
          }),
          ...(action.details.target &&
            action.details.target.type === 'block' && {
              target: {
                ...action.details.target,
                value: idMap.get(action.details.target.value) ?? action.details.target.value,
              },
            }),
        },
      })),
    }))

    return { pages, rules }
  }
}
