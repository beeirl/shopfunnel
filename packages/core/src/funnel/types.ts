import { z } from 'zod'

export const TextInputBlock = z.object({
  id: z.string(),
  type: z.literal('text_input'),
  properties: z.object({
    name: z.string(),
    placeholder: z.string().optional(),
  }),
  validations: z.object({
    required: z.boolean().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  }),
})
export type TextInputBlock = z.infer<typeof TextInputBlock>

export const MultipleChoiceBlock = z.object({
  id: z.string(),
  type: z.literal('multiple_choice'),
  properties: z.object({
    name: z.string(),
    multiple: z.boolean().optional(),
    options: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
        media: z
          .object({
            type: z.enum(['emoji', 'image']),
            value: z.string(),
          })
          .optional(),
      }),
    ),
  }),
  validations: z.object({
    required: z.boolean().optional(),
    minChoices: z.number().optional(),
    maxChoices: z.number().optional(),
  }),
})
export type MultipleChoiceBlock = z.infer<typeof MultipleChoiceBlock>

export const PictureChoiceBlock = z.object({
  id: z.string(),
  type: z.literal('picture_choice'),
  properties: z.object({
    name: z.string(),
    multiple: z.boolean().optional(),
    options: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
        media: z
          .object({
            type: z.literal('image'),
            value: z.string(),
          })
          .optional(),
      }),
    ),
  }),
  validations: z.object({
    required: z.boolean().optional(),
  }),
})
export type PictureChoiceBlock = z.infer<typeof PictureChoiceBlock>

export const DropdownBlock = z.object({
  id: z.string(),
  type: z.literal('dropdown'),
  properties: z.object({
    name: z.string(),
    placeholder: z.string().optional(),
    options: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
      }),
    ),
  }),
  validations: z.object({
    required: z.boolean().optional(),
  }),
})
export type DropdownBlock = z.infer<typeof DropdownBlock>

export const HeadingBlock = z.object({
  id: z.string(),
  type: z.literal('heading'),
  properties: z.object({
    text: z.string(),
    alignment: z.enum(['left', 'center']),
  }),
})
export type HeadingBlock = z.infer<typeof HeadingBlock>

export const ParagraphBlock = z.object({
  id: z.string(),
  type: z.literal('paragraph'),
  properties: z.object({
    text: z.string(),
    alignment: z.enum(['left', 'center']),
  }),
})
export type ParagraphBlock = z.infer<typeof ParagraphBlock>

export const GaugeBlock = z.object({
  id: z.string(),
  type: z.literal('gauge'),
  properties: z.object({
    value: z.number(),
    tooltipLabel: z.string().optional(),
    marks: z.array(z.string()).optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
  }),
})
export type GaugeBlock = z.infer<typeof GaugeBlock>

export const LoaderBlock = z.object({
  id: z.string(),
  type: z.literal('loader'),
  properties: z.object({
    description: z.string().optional(),
    duration: z.number().optional(),
    showProgress: z.boolean().optional(),
    steps: z
      .object({
        variant: z.enum(['checklist', 'fade', 'slide']),
        items: z.array(z.string()),
      })
      .optional(),
  }),
})
export type LoaderBlock = z.infer<typeof LoaderBlock>

export const ImageBlock = z.object({
  id: z.string(),
  type: z.literal('image'),
  properties: z.object({
    url: z.string().optional(),
  }),
})
export type ImageBlock = z.infer<typeof ImageBlock>

export const SpacerBlock = z.object({
  id: z.string(),
  type: z.literal('spacer'),
  properties: z.object({
    size: z.enum(['sm', 'md', 'lg']),
  }),
})
export type SpacerBlock = z.infer<typeof SpacerBlock>

export const HtmlBlock = z.object({
  id: z.string(),
  type: z.literal('html'),
  properties: z.object({
    html: z.string(),
    bleed: z.enum(['none', 'horizontal', 'vertical', 'full']).optional(),
    media: z.array(
      z.object({
        type: z.literal('image'),
        value: z.string(),
      }),
    ),
  }),
})
export type HtmlBlock = z.infer<typeof HtmlBlock>

export const BinaryChoiceBlock = z.object({
  id: z.string(),
  type: z.literal('binary_choice'),
  properties: z.object({
    name: z.string(),
    label: z.string().optional(),
    options: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        backgroundColor: z.string().optional(),
        foregroundColor: z.string().optional(),
      }),
    ),
  }),
})
export type BinaryChoiceBlock = z.infer<typeof BinaryChoiceBlock>

export const Block = z.discriminatedUnion('type', [
  TextInputBlock,
  MultipleChoiceBlock,
  PictureChoiceBlock,
  DropdownBlock,
  HeadingBlock,
  ParagraphBlock,
  GaugeBlock,
  ImageBlock,
  LoaderBlock,
  SpacerBlock,
  HtmlBlock,
  BinaryChoiceBlock,
])
export type Block = z.infer<typeof Block>

export const INPUT_BLOCKS = ['text_input', 'multiple_choice', 'picture_choice', 'dropdown', 'binary_choice'] as const
export type InputBlock = (typeof INPUT_BLOCKS)[number]

export const Page = z.object({
  id: z.string(),
  name: z.string(),
  blocks: z.array(Block),
  properties: z.object({
    buttonText: z.string(),
    redirectUrl: z.string().optional(),
    showProgressBar: z.boolean().optional(),
    headerPosition: z.enum(['relative', 'fixed']).optional(),
  }),
})
export type Page = z.infer<typeof Page>

export type Variables = Record<string, string | number>

export const ConditionVar = z.object({
  type: z.enum(['block', 'variable', 'constant']),
  value: z.union([z.string(), z.number(), z.boolean()]),
})
export type ConditionVar = z.infer<typeof ConditionVar>

export const ComparisonCondition = z.union([
  z.object({
    op: z.enum(['lt', 'lte', 'gt', 'gte', 'eq', 'neq']),
    vars: z.array(ConditionVar),
  }),
  z.object({
    op: z.literal('always'),
  }),
])
export type ComparisonCondition = z.infer<typeof ComparisonCondition>

export const LogicalCondition = z.object({
  op: z.enum(['and', 'or']),
  vars: z.array(ComparisonCondition),
})
export type LogicalCondition = z.infer<typeof LogicalCondition>

export const Condition = z.union([ComparisonCondition, LogicalCondition])
export type Condition = z.infer<typeof Condition>

export const RuleAction = z.object({
  type: z.enum(['jump', 'hide', 'add', 'subtract', 'multiply', 'divide', 'set']),
  condition: Condition,
  details: z.object({
    to: z
      .object({
        type: z.literal('page'),
        value: z.string(),
      })
      .optional(),
    target: z
      .object({
        type: z.enum(['block', 'variable']),
        value: z.string(),
      })
      .optional(),
    value: z
      .object({
        type: z.enum(['constant', 'variable']),
        value: z.number(),
      })
      .optional(),
  }),
})
export type RuleAction = z.infer<typeof RuleAction>

export const Rule = z.object({
  pageId: z.string(),
  actions: z.array(RuleAction),
})
export type Rule = z.infer<typeof Rule>

export const Theme = z.object({
  logoUrl: z.string().optional(),
  radius: z.string(),
  style: z.enum(['outline', 'soft']),
  colors: z.object({
    primary: z.string(),
    primaryForeground: z.string(),
    background: z.string(),
    foreground: z.string(),
  }),
})
export type Theme = z.infer<typeof Theme>

export const Settings = z.object({
  privacyUrl: z.string().optional(),
  termsUrl: z.string().optional(),
})
export type Settings = z.infer<typeof Settings>

export interface ResolvedSettings extends Settings {
  faviconUrl?: string | null
  faviconType?: string | null
  customCode?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  metaImageUrl?: string | null
}

export const TrafficSplit = z.object({
  funnelVariantId: z.string(),
  percentage: z.number().int().min(0).max(100),
})
export type TrafficSplit = z.infer<typeof TrafficSplit>

export interface Info {
  id: string
  workspaceId: string
  domainId?: string | null
  shortId: string
  title: string
  variantId: string
  variantTitle?: string
  variantVersion?: number | null
  pages: Page[]
  rules: Rule[]
  variables: Variables
  theme: Theme
  settings?: ResolvedSettings
  url: string
  createdAt?: Date
}
