import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { InputGroup } from '@/components/ui/input-group'
import { FunnelClone } from '@shopfunnel/core/funnel/clone'
import { Block, type ComparisonCondition, type Condition, Page, Rule } from '@shopfunnel/core/funnel/types'
import { IconCheck as CheckIcon, IconCopy as CopyIcon } from '@tabler/icons-react'
import * as React from 'react'
import { isValid as isValidUlid, ulid } from 'ulid'
import { z } from 'zod'
import { useFunnel } from '../../-context'

const FunnelSchema = z.object({
  pages: z.array(Page),
  rules: z.array(Rule),
})

const SCHEMA_INSTRUCTIONS = `Output format:
{ "pages": [...], "rules": [...] }

## Pages

Each page is an object with the following shape:
{
  "id": string (unique identifier, e.g. "page_1", "page_intro"),
  "name": string,
  "blocks": Block[],
  "properties": {
    "buttonText": string,
    "redirectUrl"?: string,
    "showProgressBar"?: boolean,
    "headerPosition"?: "relative" | "fixed"
  }
}

## Blocks

Blocks use a discriminated union on the "type" field. Every block has an "id" (unique string) and a "type". Below are all valid block types:

### text_input
{
  "id": string,
  "type": "text_input",
  "properties": {
    "name": string,
    "placeholder"?: string
  },
  "validations": {
    "required"?: boolean,
    "minLength"?: number,
    "maxLength"?: number
  }
}

### multiple_choice
{
  "id": string,
  "type": "multiple_choice",
  "properties": {
    "name": string,
    "multiple"?: boolean,
    "options": [
      {
        "id": string (unique identifier, e.g. "opt_yes", "opt_1"),
        "label": string,
        "description"?: string,
        "media"?: {
          "type": "emoji" | "image",
          "value": string (when type is "emoji", must be a single emoji character, e.g. "💧")
        }
      }
    ]
  },
  "validations": {
    "required"?: boolean,
    "minChoices"?: number,
    "maxChoices"?: number
  }
}

### picture_choice
{
  "id": string,
  "type": "picture_choice",
  "properties": {
    "name": string,
    "multiple"?: boolean,
    "options": [
      {
        "id": string,
        "label": string,
        "description"?: string,
        "media"?: {
          "type": "image",
          "value": string (URL)
        }
      }
    ]
  },
  "validations": {
    "required"?: boolean
  }
}

### dropdown
{
  "id": string,
  "type": "dropdown",
  "properties": {
    "name": string,
    "placeholder"?: string,
    "options": [
      {
        "id": string,
        "label": string
      }
    ]
  },
  "validations": {
    "required"?: boolean
  }
}

### binary_choice
{
  "id": string,
  "type": "binary_choice",
  "properties": {
    "name": string,
    "options": [
      {
        "id": string,
        "label": string,
        "backgroundColor"?: string,
        "foregroundColor"?: string
      }
    ]
  }
}

### heading
{
  "id": string,
  "type": "heading",
  "properties": {
    "text": string,
    "alignment": "left" | "center"
  }
}

### paragraph
{
  "id": string,
  "type": "paragraph",
  "properties": {
    "text": string,
    "alignment": "left" | "center"
  }
}

### gauge
{
  "id": string,
  "type": "gauge",
  "properties": {
    "value": number,
    "tooltipLabel"?: string,
    "marks"?: string[],
    "minValue"?: number,
    "maxValue"?: number
  }
}

### loader
{
  "id": string,
  "type": "loader",
  "properties": {
    "description"?: string,
    "duration"?: number,
    "showProgress"?: boolean,
    "steps"?: {
      "variant": "checklist" | "fade" | "slide",
      "items": string[]
    }
  }
}

### image
{
  "id": string,
  "type": "image",
  "properties": {
    "url"?: string
  }
}

### spacer
{
  "id": string,
  "type": "spacer",
  "properties": {
    "size": "sm" | "md" | "lg"
  }
}

### html
{
  "id": string,
  "type": "html",
  "properties": {
    "html": string (raw HTML),
    "bleed"?: "none" | "horizontal" | "vertical" | "full",
    "media": [
      {
        "type": "image",
        "value": string (URL)
      }
    ]
  }
}

## Rules

Pages are displayed in array order by default — no rules are needed for sequential navigation. Only add rules when you need conditional logic (e.g. branching based on user answers, skipping pages, hiding blocks).

Each rule targets a specific page and contains an array of actions:
{
  "pageId": string (must reference a page's id),
  "actions": RuleAction[]
}

### RuleAction
{
  "type": "jump" | "hide" | "add" | "subtract" | "multiply" | "divide" | "set",
  "condition": Condition,
  "details": {
    "to"?: {
      "type": "page",
      "value": string (target page id)
    },
    "target"?: {
      "type": "block" | "variable",
      "value": string
    },
    "value"?: {
      "type": "constant" | "variable",
      "value": number
    }
  }
}

### Condition (union type)

A condition can be one of:

1. Comparison condition:
{
  "op": "lt" | "lte" | "gt" | "gte" | "eq" | "neq",
  "vars": [
    {
      "type": "block" | "variable" | "constant",
      "value": string | number | boolean
    }
  ]
}

When comparing against a multiple_choice, picture_choice, dropdown, or binary_choice block, the "constant" value must be the option's "id" (e.g. "opt_yes"), NOT the option's label text.

2. Always condition (unconditional):
{
  "op": "always"
}

3. Logical condition (combines comparisons):
{
  "op": "and" | "or",
  "vars": ComparisonCondition[]
}

## Important Rules

- Input block types are: text_input, multiple_choice, picture_choice, dropdown, binary_choice. These are the only blocks that can be referenced in rule conditions.
- Rule pageId must reference an existing page id.
- Jump action "to" values must reference an existing page id.
- The "always" condition has no "vars" field.
- Do NOT generate rules with "always" conditions that simply jump to the next page in sequence — sequential flow is automatic. Only use rules for conditional branching or non-linear navigation.
- If no conditional logic is needed, set "rules" to an empty array: [].
- Page order matters. Pages render sequentially by array position. Always place pages in the exact order the user should see them. Branching pages (jump targets) must be positioned immediately after the page that triggers the jump, so the fallback flow is logical if rules aren't evaluated.
- Always-jump rules for branch convergence. After a branching page rejoins the main flow, always add an "op": "always" rule to explicitly jump it back to the correct convergence page. Do not rely on sequential fallback for branch pages.
- Every possible answer must be covered. When writing jump rules for a question, every selectable option must be accounted for across the full set of conditions. No answer should fall through without an explicit rule. Do a final check: count the options on the source question and confirm each one maps to a condition.
- Actions are evaluated top-to-bottom. The first matching "jump" action wins — subsequent jumps are ignored. All "hide" and math actions continue to evaluate even after a jump matches. Place "always" jump fallbacks last in the actions array.
- Return the result as a single JSON object: { "pages": [...], "rules": [...] }
- Output ONLY the raw JSON object. Do not wrap it in markdown code fences or include any explanation.
`

const CREATE_PREAMBLE = `Create a new funnel schema for ShopFunnel. The schema is a JSON object with two top-level arrays: "pages" and "rules". All "id" fields in pages, blocks, and options must be unique strings. Use short, descriptive IDs (e.g. "page_1", "block_email", "opt_yes").`

const UPDATE_PREAMBLE = `Update the existing funnel schema for ShopFunnel below. The schema is a JSON object with two top-level arrays: "pages" and "rules". CRITICAL ID RULES:
- You MUST keep all existing IDs exactly as they are for pages, blocks, and options that are not being removed. These IDs are referenced by external systems (answer tracking, analytics) and changing them will corrupt data.
- Only assign new short descriptive IDs (e.g. "page_new_1", "block_new_1", "opt_new_1") for items you are ADDING.
- If you are renaming, reordering, or modifying an existing item, keep its original ID unchanged.
- You may remove pages/blocks/options entirely — just omit them from the output.
`

function getCreatePrompt(): string {
  return CREATE_PREAMBLE + SCHEMA_INSTRUCTIONS
}

function getUpdatePrompt(data: { pages: z.infer<typeof Page>[]; rules: z.infer<typeof Rule>[] }): string {
  const schema = JSON.stringify({ pages: data.pages, rules: data.rules }, null, 2)
  return UPDATE_PREAMBLE + SCHEMA_INSTRUCTIONS + '\nCurrent schema:\n' + schema
}

function replaceIds(data: z.infer<typeof FunnelSchema>): z.infer<typeof FunnelSchema> {
  // Clone with preserved ULIDs (only replace placeholder IDs like "page_1", "opt_yes")
  const result = FunnelClone.clone(data, (oldId) => (isValidUlid(oldId) ? oldId : ulid()))

  // Resolve label-based constants in rules (AI sometimes outputs option labels instead of IDs)
  const blockLabelToOptionId = new Map<string, Map<string, string>>()
  for (const page of result.pages) {
    for (const block of page.blocks) {
      if ('options' in block.properties) {
        const typed = block as Extract<Block, { properties: { options: unknown[] } }>
        const labelMap = new Map<string, string>()
        for (const option of typed.properties.options) {
          labelMap.set(option.label, option.id)
        }
        blockLabelToOptionId.set(block.id, labelMap)
      }
    }
  }

  const resolveComparison = (condition: ComparisonCondition): ComparisonCondition => {
    if (condition.op === 'always') return condition
    const blockVar = condition.vars.find((v) => v.type === 'block')
    const constantVar = condition.vars.find((v) => v.type === 'constant')
    if (blockVar && constantVar && typeof constantVar.value === 'string') {
      const labelMap = blockLabelToOptionId.get(String(blockVar.value))
      if (labelMap) {
        const optionId = labelMap.get(String(constantVar.value))
        if (optionId) {
          return { ...condition, vars: condition.vars.map((v) => (v === constantVar ? { ...v, value: optionId } : v)) }
        }
      }
    }
    return condition
  }

  const resolveCondition = (condition: Condition): Condition => {
    if ('op' in condition && (condition.op === 'and' || condition.op === 'or')) {
      return { ...condition, vars: condition.vars.map(resolveComparison) }
    }
    return resolveComparison(condition as ComparisonCondition)
  }

  return {
    pages: result.pages,
    rules: result.rules.map((rule) => ({
      ...rule,
      actions: rule.actions.map((action) => ({
        ...action,
        condition: resolveCondition(action.condition),
      })),
    })),
  }
}

export function SchemaButton() {
  const funnel = useFunnel()

  const [value, setValue] = React.useState('')
  const [lineCount, setLineCount] = React.useState<number | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = React.useState(false)

  const [copiedPrompt, setCopiedPrompt] = React.useState(false)
  const [copiedError, setCopiedError] = React.useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setError(null)

    let parsed: unknown
    try {
      parsed = JSON.parse(value)
    } catch {
      setIsSaving(false)
      setError(
        'The schema you generated is not valid JSON. Please fix the syntax and return the corrected JSON only (no markdown fences, no explanation).',
      )
      return
    }

    const result = FunnelSchema.safeParse(parsed)
    if (!result.success) {
      setIsSaving(false)
      setError(
        `The schema you generated has validation errors. Please fix them and return the corrected JSON only (no markdown fences, no explanation).\n\nErrors:\n${z.prettifyError(result.error)}`,
      )
      return
    }

    const replaced = replaceIds(result.data)
    funnel.save({ pages: replaced.pages, rules: replaced.rules })
    setValue('')
    setIsSaving(false)
    setDialogOpen(false)
  }

  const handleErrorCopy = async () => {
    if (!error) return
    await navigator.clipboard.writeText(error)
    setCopiedError(true)
    setTimeout(() => setCopiedError(false), 2000)
  }

  const handlePromptCopy = async () => {
    const prompt = funnel.data.pages.some((page) => page.blocks.length > 0)
      ? getUpdatePrompt({ pages: funnel.data.pages, rules: funnel.data.rules })
      : getCreatePrompt()
    await navigator.clipboard.writeText(prompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  return (
    <Dialog.Root
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) {
          setValue('')
          setLineCount(null)
          setError(null)
          setCopiedError(false)
        }
      }}
    >
      <Dialog.Trigger
        render={
          <Button className="cursor-pointer" variant="ghost">
            Schema
          </Button>
        }
      />
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Schema</Dialog.Title>
          <Dialog.Description>Update the funnel's pages and rules schema directly.</Dialog.Description>
        </Dialog.Header>

        <div className="flex flex-col gap-1">
          <InputGroup.Root>
            <InputGroup.Input
              aria-invalid={!!error}
              className="font-mono"
              placeholder="Paste schema..."
              readOnly
              value={lineCount ? `Pasted ${lineCount} ${lineCount === 1 ? 'line' : 'lines'}` : ''}
              onPaste={(e) => {
                e.preventDefault()
                const text = e.clipboardData.getData('text')
                setValue(text)
                setLineCount(text.split('\n').length)
                setError(null)
                setCopiedError(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && value) {
                  e.preventDefault()
                  setValue('')
                  setLineCount(null)
                  setError(null)
                  setCopiedError(false)
                }
                if (e.key === 'Enter' && value.trim()) {
                  e.preventDefault()
                  handleSave()
                }
              }}
            />
            {error ? (
              <InputGroup.Addon align="inline-end">
                <InputGroup.Button variant="secondary" onClick={handleErrorCopy}>
                  {copiedError ? 'Copied' : 'Copy error'}
                </InputGroup.Button>
              </InputGroup.Addon>
            ) : value ? (
              <InputGroup.Addon align="inline-end">
                <InputGroup.Button disabled={isSaving} variant="secondary" onClick={handleSave}>
                  Save
                </InputGroup.Button>
              </InputGroup.Addon>
            ) : null}
          </InputGroup.Root>
          {error && <p className="text-sm text-destructive">Invalid schema</p>}
        </div>

        <Dialog.Footer>
          <Button className="w-full" variant="outline" onClick={handlePromptCopy}>
            {copiedPrompt ? <CheckIcon /> : <CopyIcon />}
            {copiedPrompt ? 'Copied' : 'Copy prompt'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}
