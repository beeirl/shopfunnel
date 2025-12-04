export namespace FormSchema {
  interface TextInputFormBlock {
    id: string
    type: 'text_input'
    properties: {
      label: string
      description?: string
    }
    validations: {
      email?: boolean
      maxLength?: number
      required?: boolean
    }
  }
  interface MultipleChoiceFormBlock {
    id: string
    type: 'multiple_choice'
    properties: {
      label: string
      description?: string
      multiple?: boolean
      choices: {
        id: string
        label: string
        attachment?:
          | {
              type: 'image' | 'video'
              url: string
            }
          | {
              type: 'emoji'
              emoji: string
            }
      }[]
    }
    validations: {
      minChoices?: number
      maxChoices?: number
      required?: boolean
    }
  }
  interface DropdownFormBlock {
    id: string
    type: 'dropdown'
    properties: {
      label: string
      description?: string
      options: {
        id: string
        label: string
      }[]
    }
    validations: {
      required?: boolean
    }
  }
  interface SliderFormBlock {
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
  interface ProgressFormBlock {
    id: string
    type: 'progress'
  }
  interface HeadingFormBlock {
    id: string
    type: 'heading'
    properties: {
      text: string
    }
  }
  interface ParagraphFormBlock {
    id: string
    type: 'paragraph'
    properties: {
      text: string
    }
  }
  interface GaugeFormBlock {
    id: string
    type: 'gauge'
    properties: {
      minValue?: number
      maxValue?: number
      step?: number
      value: string
    }
  }
  interface StatCardsFormBlock {
    id: string
    type: 'stat_cards'
    properties: {
      items: {
        id: string
        emoji: string
        title: string
        value: string
      }[]
    }
  }
  export type Block =
    | TextInputFormBlock
    | MultipleChoiceFormBlock
    | DropdownFormBlock
    | SliderFormBlock
    | ProgressFormBlock
    | HeadingFormBlock
    | ParagraphFormBlock
    | GaugeFormBlock
    | StatCardsFormBlock

  export interface Page {
    id: string
    blocks: Block[]
  }

  export interface LogicalCondition {
    op: 'and' | 'or'
    vars: ComparisonCondition[]
  }

  export interface ComparisonCondition {
    op: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq' | 'always'
    vars: {
      type: 'block' | 'variable' | 'constant'
      value: string | number | boolean
    }[]
  }

  export type Condition = ComparisonCondition | LogicalCondition

  export interface Action {
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
    actions: Action[]
  }

  export type Variables = Record<string, string | number>
}

export interface FormSchema {
  pages: FormSchema.Page[]
  rules: FormSchema.Rule[]
  variables: FormSchema.Variables
}
