// ============================================
// Block
// ============================================

export interface TextInputBlock {
  id: string
  type: 'text_input'
  properties: {
    label: string
    description?: string
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
    label: string
    description?: string
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
    label: string
    description?: string
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
    label: string
    description?: string
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
  }
}

export interface ParagraphBlock {
  id: string
  type: 'paragraph'
  properties: {
    text: string
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

export interface RuleAction {
  type: 'jump' | 'hide' | 'add' | 'subtract' | 'multiply' | 'divide' | 'set'
  condition: Condition
  details: {
    to?: {
      type: 'page'
      value: string
    }
    target?: {
      type: 'block' | 'variable'
      value: string
    }
    value?: {
      type: 'constant' | 'variable'
      value: number
    }
  }
}

export interface Rule {
  pageId: string
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
