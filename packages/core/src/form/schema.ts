// ============================================
// Block Types
// ============================================

export interface ShortTextBlock {
  id: string
  type: 'short_text'
  properties: {
    label: string
    description?: string
    placeholder?: string
  }
  validations: {
    required?: boolean
    email?: boolean
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

export interface DropdownBlock {
  id: string
  type: 'dropdown'
  properties: {
    label: string
    description?: string
    options: Array<{
      id: string
      label: string
    }>
  }
  validations: {
    required?: boolean
  }
}

export interface SliderBlock {
  id: string
  type: 'slider'
  properties: {
    label: string
    description?: string
    step?: number
    defaultValue?: number
    minValue?: number
    maxValue?: number
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
    value: string
    minValue?: number
    maxValue?: number
    step?: number
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

export interface ProgressBlock {
  id: string
  type: 'progress'
  properties: {}
}

export type Block =
  | ShortTextBlock
  | MultipleChoiceBlock
  | DropdownBlock
  | SliderBlock
  | HeadingBlock
  | ParagraphBlock
  | GaugeBlock
  | ListBlock
  | ProgressBlock

export type BlockType = Block['type']

export type BlockOfType<T extends BlockType> = Extract<Block, { type: T }>

export type InputBlock = ShortTextBlock | MultipleChoiceBlock | DropdownBlock | SliderBlock
export type DisplayBlock = HeadingBlock | ParagraphBlock | GaugeBlock | ListBlock | ProgressBlock

// ============================================
// Page
// ============================================

export interface Page {
  id: string
  blocks: Block[]
  properties?: {
    buttonAction?: 'next' | 'redirect'
    buttonText?: string
    showButton?: boolean
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
// Form Schema
// ============================================

export interface FormSchema {
  pages: Page[]
  rules: Rule[]
  variables: Variables
}
