import type { Block as BlockSchema, BlockType } from '@shopfunnel/core/form/schema'
import {
  IconAdjustmentsHorizontal as AdjustmentsHorizontalIcon,
  IconChevronDown as ChevronDownIcon,
  IconDots as DotsIcon,
  IconGauge as GaugeIcon,
  IconHeading as HeadingIcon,
  IconLetterCase as LetterCaseIcon,
  IconListDetails as ListDetailsIcon,
  IconListLetters as ListLettersIcon,
  IconMenu as MenuIcon,
} from '@tabler/icons-react'
import * as React from 'react'
import { ulid } from 'ulid'
import { Dropdown } from './components/dropdown'
import { Gauge } from './components/gauge'
import { Heading } from './components/heading'
import { List } from './components/list'
import { MultipleChoice } from './components/multiple-choice'
import { Paragraph } from './components/paragraph'
import { Progress } from './components/progress'
import { ShortText } from './components/short-text'
import { Slider } from './components/slider'

interface Block {
  type: BlockType
  name: string
  description: string
  icon: React.ComponentType<any>
  component: React.ComponentType<any>
  defaultSchema: () => BlockSchema
  previewSchema: BlockSchema
}

const BLOCKS: Block[] = [
  {
    type: 'short_text',
    name: 'Short Text',
    description: `Use this to insert a question combined with a short text answer. Add an answer label or placeholder text for guidance.`,
    icon: MenuIcon,
    component: ShortText,
    defaultSchema: () => ({
      id: ulid(),
      type: 'short_text',
      properties: {
        label: 'Your question here',
        placeholder: '',
      },
      validations: {
        required: false,
      },
    }),
    previewSchema: {
      id: '',
      type: 'short_text',
      properties: {
        label: 'What is your name?',
        placeholder: 'Enter your name...',
      },
      validations: {},
    },
  },
  {
    type: 'multiple_choice',
    name: 'Multiple Choice',
    description: `Use this to insert a question combined with multiple choice answers. Add an answer label or placeholder text for guidance.`,
    icon: ListLettersIcon,
    component: MultipleChoice,
    defaultSchema: () => ({
      id: ulid(),
      type: 'multiple_choice',
      properties: {
        label: 'Your question here',
        choices: [{ id: ulid(), label: 'Choice 1' }],
      },
      validations: {
        required: false,
      },
    }),
    previewSchema: {
      id: '',
      type: 'multiple_choice',
      properties: {
        label: 'Where are you from?',
        choices: [
          { id: '1', label: 'United States' },
          { id: '2', label: 'Canada' },
          { id: '3', label: 'United Kingdom' },
        ],
      },
      validations: {},
    },
  },
  {
    type: 'dropdown',
    name: 'Dropdown',
    description: `A compact way to present many options. Users can select one option from a dropdown menu.`,
    icon: ChevronDownIcon,
    component: Dropdown,
    defaultSchema: () => ({
      id: ulid(),
      type: 'dropdown',
      properties: {
        label: 'Your question here',
        options: [{ id: ulid(), label: 'Option 1' }],
      },
      validations: {
        required: false,
      },
    }),
    previewSchema: {
      id: '',
      type: 'dropdown',
      properties: {
        label: 'Select your country',
        options: [
          { id: '1', label: 'United States' },
          { id: '2', label: 'Canada' },
          { id: '3', label: 'United Kingdom' },
        ],
      },
      validations: {},
    },
  },
  {
    type: 'slider',
    name: 'Slider',
    description: `Allow users to select a value within a range using a slider.`,
    icon: AdjustmentsHorizontalIcon,
    component: Slider,
    defaultSchema: () => ({
      id: ulid(),
      type: 'slider',
      properties: {
        label: 'Your question here',
        minValue: 0,
        maxValue: 100,
        step: 1,
      },
    }),
    previewSchema: {
      id: '',
      type: 'slider',
      properties: {
        label: 'How satisfied are you?',
        minValue: 0,
        maxValue: 100,
        step: 1,
        defaultValue: 50,
      },
    },
  },
  {
    type: 'heading',
    name: 'Heading',
    description: `Add a title or section header to organize your form and guide users through different sections.`,
    icon: HeadingIcon,
    component: Heading,
    defaultSchema: () => ({
      id: ulid(),
      type: 'heading',
      properties: {
        text: 'Your heading here',
      },
    }),
    previewSchema: {
      id: '',
      type: 'heading',
      properties: {
        text: 'Welcome to our form',
      },
    },
  },
  {
    type: 'paragraph',
    name: 'Paragraph',
    description: `Add descriptive text to provide context or instructions.`,
    icon: LetterCaseIcon,
    component: Paragraph,
    defaultSchema: () => ({
      id: ulid(),
      type: 'paragraph',
      properties: {
        text: 'Your text here',
      },
    }),
    previewSchema: {
      id: '',
      type: 'paragraph',
      properties: {
        text: 'This is a paragraph block with some descriptive text.',
      },
    },
  },
  {
    type: 'gauge',
    name: 'Gauge',
    description: `Display a visual gauge to show progress or a value within a range.`,
    icon: GaugeIcon,
    component: Gauge,
    defaultSchema: () => ({
      id: ulid(),
      type: 'gauge',
      properties: {
        value: '50',
        minValue: 0,
        maxValue: 100,
      },
    }),
    previewSchema: {
      id: '',
      type: 'gauge',
      properties: {
        value: '50',
        minValue: 0,
        maxValue: 100,
      },
    },
  },
  {
    type: 'list',
    name: 'List',
    description: `Display a list of items with icons and text. Great for showing features or benefits.`,
    icon: ListDetailsIcon,
    component: List,
    defaultSchema: () => ({
      id: ulid(),
      type: 'list',
      properties: {
        orientation: 'vertical' as const,
        textPlacement: 'right' as const,
        size: 'sm' as const,
        items: [{ id: ulid(), title: 'Item', media: { type: 'emoji' as const, value: '✓' } }],
      },
    }),
    previewSchema: {
      id: '',
      type: 'list',
      properties: {
        orientation: 'vertical' as const,
        textPlacement: 'right' as const,
        size: 'sm' as const,
        items: [
          { id: '1', title: 'First item', media: { type: 'emoji' as const, value: '✓' } },
          { id: '2', title: 'Second item', media: { type: 'emoji' as const, value: '✓' } },
          { id: '3', title: 'Third item', media: { type: 'emoji' as const, value: '✓' } },
        ],
      },
    },
  },
  {
    type: 'progress',
    name: 'Progress',
    description: `Show users how far along they are in completing the form.`,
    icon: DotsIcon,
    component: Progress,
    defaultSchema: () => ({
      id: ulid(),
      type: 'progress',
      properties: {},
    }),
    previewSchema: {
      id: '',
      type: 'progress',
      properties: {},
    },
  },
]

export function getBlock(type: BlockType) {
  return BLOCKS.find((block) => block.type === type)!
}

export function getBlocks() {
  return BLOCKS
}

export type BlockComponentProps =
  | {
      mode: 'preview'
      schema: BlockSchema
    }
  | {
      mode: 'live'
      schema: BlockSchema
      value?: unknown
      onChange?: (value: unknown) => void
    }

export function Block(props: BlockComponentProps) {
  const block = getBlock(props.schema.type)
  if (!block) return null
  return <block.component {...props} />
}
