import { cn } from '@/lib/utils'
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
  category: 'input' | 'display'
  icon: React.ComponentType<any>
  component: React.ComponentType<any>
}

const BLOCKS: Block[] = [
  {
    type: 'short_text',
    name: 'Short Text',
    description: `Use this to insert a question combined with a short text answer. Add an answer label or placeholder text for guidance.`,
    category: 'input',
    icon: MenuIcon,
    component: ShortText,
  },
  {
    type: 'multiple_choice',
    name: 'Multiple Choice',
    description: `Use this to insert a question combined with multiple choice answers. Add an answer label or placeholder text for guidance.`,
    category: 'input',
    icon: ListLettersIcon,
    component: MultipleChoice,
  },
  {
    type: 'dropdown',
    name: 'Dropdown',
    description: `A compact way to present many options. Users can select one option from a dropdown menu.`,
    category: 'input',
    icon: ChevronDownIcon,
    component: Dropdown,
  },
  {
    type: 'slider',
    name: 'Slider',
    description: `Allow users to select a value within a range using a slider.`,
    category: 'input',
    icon: AdjustmentsHorizontalIcon,
    component: Slider,
  },
  {
    type: 'heading',
    name: 'Heading',
    description: `Add a title or section header to organize your form and guide users through different sections.`,
    category: 'display',
    icon: HeadingIcon,
    component: Heading,
  },
  {
    type: 'paragraph',
    name: 'Paragraph',
    description: `Add descriptive text to provide context or instructions.`,
    category: 'display',
    icon: LetterCaseIcon,
    component: Paragraph,
  },
  {
    type: 'gauge',
    name: 'Gauge',
    description: `Display a visual gauge to show progress or a value within a range.`,
    category: 'display',
    icon: GaugeIcon,
    component: Gauge,
  },
  {
    type: 'list',
    name: 'List',
    description: `Display a list of items with icons and text. Great for showing features or benefits.`,
    category: 'display',
    icon: ListDetailsIcon,
    component: List,
  },
  {
    type: 'progress',
    name: 'Progress',
    description: `Show users how far along they are in completing the form.`,
    category: 'display',
    icon: DotsIcon,
    component: Progress,
  },
]

export function getBlock(type: BlockType) {
  return BLOCKS.find((block) => block.type === type)!
}

export function getBlocks() {
  return BLOCKS
}

export type BlockProps =
  | {
      mode: 'preview'
      schema: BlockSchema
      selected?: boolean
      onSelect?: () => void
    }
  | {
      mode: 'live'
      schema: BlockSchema
      value?: unknown
      onChange?: (value: unknown) => void
    }

export function Block(props: BlockProps) {
  const block = getBlock(props.schema.type)
  if (props.mode === 'preview') {
    return (
      <div
        className={cn(
          'relative cursor-pointer transition-all',
          'before:absolute before:-inset-3 before:rounded-2xl before:border before:border-transparent before:ring-3 before:ring-transparent before:transition-all hover:before:border-ring hover:before:ring-ring/50',
          props.selected && 'before:border-ring before:ring-ring/50',
        )}
        onClick={(e) => {
          e.stopPropagation()
          props.onSelect?.()
        }}
      >
        <block.component {...props} />
      </div>
    )
  }
  return <block.component {...props} />
}
