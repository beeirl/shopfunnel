// ============================================
// Block
// ============================================

export interface TextInputBlock {
  id: string
  type: 'text_input'
  properties: {
    name: string
    placeholder?: string
  }
  validations: {
    required?: boolean
    minLength?: number
    maxLength?: number
  }
}

export interface MultipleChoiceBlock {
  id: string
  type: 'multiple_choice'
  properties: {
    name: string
    multiple?: boolean
    choices: Array<{
      id: string
      label: string
      description?: string
      media?: {
        type: 'emoji' | 'image'
        value: string
      }
    }>
  }
  validations: {
    required?: boolean
    minChoices?: number
    maxChoices?: number
  }
}

export interface PictureChoiceBlock {
  id: string
  type: 'picture_choice'
  properties: {
    name: string
    multiple?: boolean
    choices: Array<{
      id: string
      label: string
      description?: string
      media?: {
        type: 'image'
        value: string
      }
    }>
  }
  validations: {
    required?: boolean
  }
}

export interface DropdownBlock {
  id: string
  type: 'dropdown'
  properties: {
    name: string
    placeholder?: string
    options: Array<{
      id: string
      label: string
    }>
  }
  validations: {
    required?: boolean
  }
}

export interface HeadingBlock {
  id: string
  type: 'heading'
  properties: {
    text: string
    alignment: 'left' | 'center'
  }
}

export interface ParagraphBlock {
  id: string
  type: 'paragraph'
  properties: {
    text: string
    alignment: 'left' | 'center'
  }
}

export interface GaugeBlock {
  id: string
  type: 'gauge'
  properties: {
    value: number
    tooltipLabel?: string
    marks?: string[]
    minValue?: number
    maxValue?: number
  }
}

export interface ListBlock {
  id: string
  type: 'list'
  properties: {
    orientation: 'horizontal' | 'vertical'
    textPlacement: 'bottom' | 'right'
    size: 'sm' | 'lg'
    items: Array<{
      id: string
      title: string
      subtitle?: string
      media?: {
        type: 'emoji' | 'image'
        value: string
      }
    }>
  }
}

export interface LoaderBlock {
  id: string
  type: 'loader'
  properties: {
    description?: string
    duration: number
  }
}

export interface ImageBlock {
  id: string
  type: 'image'
  properties: {
    url?: string
  }
}

export type Block =
  | TextInputBlock
  | MultipleChoiceBlock
  | PictureChoiceBlock
  | DropdownBlock
  | HeadingBlock
  | ParagraphBlock
  | GaugeBlock
  | ListBlock
  | ImageBlock
  | LoaderBlock

// ============================================
// Page
// ============================================

export interface Page {
  id: string
  blocks: Block[]
  properties: {
    showButton: boolean
    buttonText: string
    buttonAction: 'next' | 'redirect'
    redirectUrl?: string
  }
}

// ============================================
// Variables
// ============================================

export type Variables = Record<string, string | number>

// ============================================
// Rules & Conditions
// ============================================
//
// Rules define conditional logic that is evaluated when the user navigates
// away from a page (e.g., presses the "next" button). Each rule is associated
// with a specific page via `pageId`.
//
// Evaluation Flow:
// 1. User completes a page and triggers navigation
// 2. The rule for the current page is found and evaluated
// 3. Each action's condition is checked against current block values and variables
// 4. Matching actions are executed in order:
//    - `jump`: Determines which page to navigate to (overrides sequential navigation)
//    - `hide`: Marks blocks to be hidden on the DESTINATION page (not the current page)
//    - Math ops (add, subtract, multiply, divide, set): Update variable values
// 5. Navigation occurs to the determined page with updated state
//
// Important: Hide actions reference block IDs on the NEXT page, not the current page.
// This allows conditional display of content based on previous answers.

export interface LogicalCondition {
  op: 'and' | 'or'
  vars: ComparisonCondition[]
}

export interface ComparisonCondition {
  op: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq' | 'always'
  vars: Array<{
    type: 'block' | 'variable' | 'constant'
    value: string | number | boolean
  }>
}

export type Condition = ComparisonCondition | LogicalCondition

/**
 * An action to execute when its condition is met.
 *
 * Action types:
 * - `jump`: Navigate to a specific page (uses `details.to`)
 * - `hide`: Hide a block on the destination page (uses `details.target` with type 'block')
 * - `add`, `subtract`, `multiply`, `divide`, `set`: Perform math on a variable
 *   (uses `details.target` with type 'variable' and `details.value`)
 */
export interface RuleAction {
  type: 'jump' | 'hide' | 'add' | 'subtract' | 'multiply' | 'divide' | 'set'
  /** The condition that must be true for this action to execute */
  condition: Condition
  details: {
    /** Target page for 'jump' actions */
    to?: {
      type: 'page'
      value: string
    }
    /** Target block (for 'hide') or variable (for math operations) */
    target?: {
      type: 'block' | 'variable'
      value: string
    }
    /** Value to use in math operations */
    value?: {
      type: 'constant' | 'variable'
      value: number
    }
  }
}

/**
 * A rule associated with a specific page, evaluated when the user leaves that page.
 * Contains a list of actions that are executed if their conditions are met.
 */
export interface Rule {
  /** The page this rule belongs to (evaluated when leaving this page) */
  pageId: string
  /** Actions to evaluate and potentially execute */
  actions: RuleAction[]
}

// ============================================
// Theme
// ============================================

export interface Colors {
  primary: string
  primaryForeground: string
  background: string
  foreground: string
}

export const RADII = [
  { name: 'none', value: '0' },
  { name: 'small', value: '0.45rem' },
  { name: 'medium', value: '0.625rem' },
  { name: 'large', value: '0.875rem' },
] as const

export type Radius = (typeof RADII)[number]

export interface Theme {
  colors: Colors
  radius: Radius
  logo?: string
}

// ============================================
// Info
// ============================================

export interface Info {
  id: string
  shortId: string
  title: string
  pages: Page[]
  rules: Rule[]
  variables: Variables
  theme: Theme
  published: boolean
  createdAt: Date
  publishedAt: Date | null
}
