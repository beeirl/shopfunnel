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
      attachment?: { type: 'emoji'; emoji: string } | { type: 'image'; url: string }
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
      icon?: string
      attachment?: { type: 'emoji'; value: string } | { type: 'image'; value: string }
    }>
  }
}

export interface ProgressBlock {
  id: string
  type: 'progress'
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
    buttonText?: string
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

export const COLORS = [
  {
    name: 'blue',
    value: {
      light: {
        primary: 'oklch(0.488 0.243 264.376)',
        primaryForeground: 'oklch(0.97 0.014 254.604)',
        secondary: 'oklch(0.97 0.014 254.604)',
        secondaryForeground: 'oklch(0.21 0.006 285.885)',
      },
    },
  },
] as const

export type Color = (typeof COLORS)[number]
export type ColorName = Color['name']
export type ColorValue = Color['value']

export const FONTS = [
  {
    name: 'Inter',
    value: 'inter',
  },
] as const

export type Font = (typeof FONTS)[number]
export type FontName = Font['name']
export type FontValue = Font['value']

export const RADII = [
  { name: 'none', value: '0' },
  { name: 'small', value: '0.45rem' },
  { name: 'medium', value: '0.625rem' },
  { name: 'large', value: '0.875rem' },
] as const

export type Radius = (typeof RADII)[number]
export type RadiusName = Radius['name']
export type RadiusValue = Radius['value']

export const STYLES = [
  {
    name: 'standard',
  },
  {
    name: 'compact',
  },
] as const

export type Style = (typeof STYLES)[number]
export type StyleName = Style['name']

export interface Theme {
  color: Color
  radius: Radius
  style: Style
}
