import type { Block } from '@shopfunnel/core/form/types'
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
import { DropdownBlock, DropdownBlockProps } from './blocks/dropdown'
import { GaugeBlock, GaugeBlockProps } from './blocks/gauge'
import { HeadingBlock, HeadingBlockProps } from './blocks/heading'
import { ListBlock, ListBlockProps } from './blocks/list'
import { MultipleChoiceBlock, MultipleChoiceBlockProps } from './blocks/multiple-choice'
import { ParagraphBlock, ParagraphBlockProps } from './blocks/paragraph'
import { ProgressBlock, ProgressBlockProps } from './blocks/progress'
import { ShortTextBlock, ShortTextBlockProps } from './blocks/short-text'
import { SliderBlock, SliderBlockProps } from './blocks/slider'

export interface FormBlockProps {
  static: boolean
  block: Block
  value?: unknown
  onValueChange?: (value: unknown) => void
}

interface FormBlockType {
  type: Block['type']
  name: string
  description: string
  category: 'input' | 'display'
  icon: React.ComponentType<{ className?: string }>
  render: (props: FormBlockProps) => React.ReactNode
}

const FORM_BLOCK_TYPES: FormBlockType[] = [
  {
    type: 'short_text',
    name: 'Short Text',
    description: `Use this to insert a question combined with a short text answer. Add an answer label or placeholder text for guidance.`,
    category: 'input',
    icon: MenuIcon,
    render: ({ block, ...rest }) => <ShortTextBlock {...({ data: block, ...rest } as ShortTextBlockProps)} />,
  },
  {
    type: 'multiple_choice',
    name: 'Multiple Choice',
    description: `Use this to insert a question combined with multiple choice answers. Add an answer label or placeholder text for guidance.`,
    category: 'input',
    icon: ListLettersIcon,
    render: ({ block, ...rest }) => <MultipleChoiceBlock {...({ data: block, ...rest } as MultipleChoiceBlockProps)} />,
  },
  {
    type: 'dropdown',
    name: 'Dropdown',
    description: `A compact way to present many options. Users can select one option from a dropdown menu.`,
    category: 'input',
    icon: ChevronDownIcon,
    render: ({ block, ...rest }) => <DropdownBlock {...({ data: block, ...rest } as DropdownBlockProps)} />,
  },
  {
    type: 'slider',
    name: 'Slider',
    description: `Allow users to select a value within a range using a slider.`,
    category: 'input',
    icon: AdjustmentsHorizontalIcon,
    render: ({ block, ...rest }) => <SliderBlock {...({ data: block, ...rest } as SliderBlockProps)} />,
  },
  {
    type: 'heading',
    name: 'Heading',
    description: `Add a title or section header to organize your form and guide users through different sections.`,
    category: 'display',
    icon: HeadingIcon,
    render: ({ block, ...rest }) => <HeadingBlock {...({ data: block, ...rest } as HeadingBlockProps)} />,
  },
  {
    type: 'paragraph',
    name: 'Paragraph',
    description: `Add descriptive text to provide context or instructions.`,
    category: 'display',
    icon: LetterCaseIcon,
    render: ({ block, ...rest }) => <ParagraphBlock {...({ data: block, ...rest } as ParagraphBlockProps)} />,
  },
  {
    type: 'gauge',
    name: 'Gauge',
    description: `Display a visual gauge to show progress or a value within a range.`,
    category: 'display',
    icon: GaugeIcon,
    render: ({ block, ...rest }) => <GaugeBlock {...({ data: block, ...rest } as GaugeBlockProps)} />,
  },
  {
    type: 'list',
    name: 'List',
    description: `Display a list of items with icons and text. Great for showing features or benefits.`,
    category: 'display',
    icon: ListDetailsIcon,
    render: ({ block, ...rest }) => <ListBlock {...({ data: block, ...rest } as ListBlockProps)} />,
  },
  {
    type: 'progress',
    name: 'Progress',
    description: `Show users how far along they are in completing the form.`,
    category: 'display',
    icon: DotsIcon,
    render: ({ block, ...rest }) => <ProgressBlock {...({ data: block, ...rest } as ProgressBlockProps)} />,
  },
]

export function getFormBlockType(type: Block['type']) {
  return FORM_BLOCK_TYPES.find((block) => block.type === type)!
}

export function getFormBlockTypes() {
  return FORM_BLOCK_TYPES
}

export function FormBlock(props: FormBlockProps) {
  const blockType = getFormBlockType(props.block.type)
  return blockType.render(props)
}
