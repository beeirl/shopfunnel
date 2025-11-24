import { index, jsonb, pgTable, varchar } from 'drizzle-orm/pg-core'
import { timestamp, timestampColumns, workspaceColumns, workspaceIndexes } from '../database/types'

interface FormFieldBase {
  id: string
  title: string
  attachment?: {
    type: 'image' | 'video'
    description?: string
    url: string
  }
}

interface CardFormField extends FormFieldBase {
  type: 'card'
  properties: {
    title: string
    description?: string
  }
}

interface GaugeFormField extends FormFieldBase {
  type: 'gauge'
  properties: {
    description?: string
    value: number
  }
}

interface GroupFormField extends FormFieldBase {
  type: 'group'
  properties: {
    description?: string
    fields: (FormField & {
      type: Omit<FormField['type'], 'group'>
    })[]
  }
}

interface SelectFormField extends FormFieldBase {
  type: 'select'
  properties: {
    description?: string
    options: {
      label: string
    }[]
  }
  validations: {
    required?: boolean
  }
}

interface MultipleChoiceFormField extends FormFieldBase {
  type: 'multiple_choice'
  properties: {
    description?: string
    multiple?: boolean
    choices: {
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

interface ProgressFormField extends FormFieldBase {
  type: 'progress'
  properties: {
    description?: string
  }
}

interface SliderFormField extends FormFieldBase {
  type: 'slider'
  properties: {
    description?: string
    step?: number
    defaultValue?: number
    minValue?: number
    maxValue?: number
  }
}

interface StatementFormField extends FormFieldBase {
  type: 'statement'
  properties: {
    description?: string
  }
}

interface TextInputFormField extends FormFieldBase {
  type: 'text_input'
  properties: {
    description?: string
  }
  validations: {
    email?: boolean
    maxLength?: number
    required?: boolean
  }
}

export type FormWelcomePage = {
  ref: string
  title?: string
  properties?: {
    description?: string
    buttonText?: string
    showButton?: boolean
  }
  layout?: {
    type: string
    attachment?: {
      type: string
      href: string
      properties?: {
        decorative?: boolean
      }
    }
    placement?: string
    viewportOverrides?: Record<string, any>
  }
}

export type FormThankYouPage = {
  id: string
  title?: string
  properties?: {
    description?: string
    buttonText?: string
    buttonMode?: 'reload' | 'redirect'
    redirectUrl?: string
  }
  attachment?: {
    type: 'image' | 'video'
    description?: string
    url: string
  }
}

export type FormLogic = {
  id: string
  actions: {
    action: 'jump' | 'add' | 'subtract' | 'multiply' | 'divide' | 'set'
    condition: {
      op: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq' | 'always'
      vars: {
        type: 'field' | 'variable' | 'constant' | 'choice'
        value: string | number | boolean
      }[]
    }
    details: {
      to?: {
        type: 'field' | 'thank_you' | 'outcome'
        value: string
      }
      target?: {
        type: 'variable'
        value: string
      }
      value?: {
        type: 'constant' | 'variable' | 'evaluation'
        value: number
      }
    }
  }[]
}

type FormField =
  | CardFormField
  | GaugeFormField
  | GroupFormField
  | MultipleChoiceFormField
  | ProgressFormField
  | SelectFormField
  | SliderFormField
  | StatementFormField
  | TextInputFormField

export type FormVariables = Record<string, string | number>

export const FormTable = pgTable(
  'form',
  {
    ...workspaceColumns,
    ...timestampColumns,
    title: varchar('title', { length: 255 }).notNull(),
    fields: jsonb('fields').$type<FormField[]>(),
    welcomePages: jsonb('welcome_pages').$type<FormWelcomePage[]>(),
    thankYouPages: jsonb('thank_you_pages').$type<FormThankYouPage[]>(),
    logic: jsonb('logic').$type<FormLogic[]>(),
    variables: jsonb('variables').$type<FormVariables>(),
    closedAt: timestamp('closed_at'),
    closesAt: timestamp('closes_at'),
  },
  (table) => [...workspaceIndexes(table), index('form_workspace_id').on(table.workspaceID)],
)
