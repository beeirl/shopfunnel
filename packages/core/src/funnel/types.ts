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
    options: Array<{
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
    options: Array<{
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

export interface LoaderBlock {
  id: string
  type: 'loader'
  properties: {
    description?: string
    duration?: number
    showProgress?: boolean
    steps?: {
      variant: 'checklist' | 'fade' | 'slide'
      items: string[]
    }
  }
}

export interface ImageBlock {
  id: string
  type: 'image'
  properties: {
    url?: string
  }
}

export interface SpacerBlock {
  id: string
  type: 'spacer'
  properties: {
    size: 'sm' | 'md' | 'lg'
  }
}

export interface HtmlBlock {
  id: string
  type: 'html'
  properties: {
    html: string
    media: Array<{
      type: 'image'
      value: string
    }>
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
  | ImageBlock
  | LoaderBlock
  | SpacerBlock
  | HtmlBlock

export const INPUT_BLOCKS = ['text_input', 'multiple_choice', 'picture_choice', 'dropdown'] as const
export type InputBlock = (typeof INPUT_BLOCKS)[number]

// ============================================
// Page
// ============================================

export interface Page {
  id: string
  name: string
  blocks: Block[]
  properties: {
    buttonText: string
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

export interface ConditionVar {
  type: 'block' | 'variable' | 'constant'
  value: string | number | boolean
}

export type ComparisonCondition =
  | {
      op: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq'
      vars: ConditionVar[]
    }
  | {
      op: 'always'
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

export interface Theme {
  logoUrl?: string
  radius: string
  style: 'outline' | 'soft'
  colors: {
    primary: string
    primaryForeground: string
    background: string
    foreground: string
  }
}

// ============================================
// Settings
// ============================================

export interface Settings {
  privacyUrl?: string
  termsUrl?: string
}

export interface ResolvedSettings extends Settings {
  faviconUrl?: string | null
  faviconType?: string | null
  customCode?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  metaImageUrl?: string | null
}

// ============================================
// Info
// ============================================

export interface Info {
  id: string
  workspaceId: string
  domainId: string | null
  shortId: string
  title: string
  version: number
  pages: Page[]
  rules: Rule[]
  variables: Variables
  theme: Theme
  settings?: ResolvedSettings
  published: boolean
  draft: boolean
  url: string
  createdAt: Date
  publishedAt: Date | null
}
