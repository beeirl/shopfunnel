import type { Block } from '@shopfunnel/core/form/types'
import {
  IconChevronDown as ChevronDownIcon,
  IconGauge as GaugeIcon,
  IconHeading as HeadingIcon,
  IconLayoutGrid as LayoutGridIcon,
  IconLetterCase as LetterCaseIcon,
  IconListDetails as ListDetailsIcon,
  IconListLetters as ListLettersIcon,
  IconLoader as LoaderIcon,
  IconMenu as MenuIcon,
  IconPhoto as PhotoIcon,
} from '@tabler/icons-react'
import * as React from 'react'
import { DropdownBlock, DropdownBlockProps } from './blocks/dropdown'
import { GaugeBlock, GaugeBlockProps } from './blocks/gauge'
import { HeadingBlock, HeadingBlockProps } from './blocks/heading'
import { ImageBlock, ImageBlockProps } from './blocks/image'
import { ListBlock, ListBlockProps } from './blocks/list'
import { LoaderBlock, LoaderBlockProps } from './blocks/loader'
import { MultipleChoiceBlock, MultipleChoiceBlockProps } from './blocks/multiple-choice'
import { ParagraphBlock, ParagraphBlockProps } from './blocks/paragraph'
import { PictureChoiceBlock, PictureChoiceBlockProps } from './blocks/picture-choice'
import { TextInputBlock, TextInputBlockProps } from './blocks/text-input'

export interface FormBlockProps {
  static?: boolean
  block: Block
  index: number
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
    type: 'text_input',
    name: 'Text Input',
    description: `Use this to insert a question combined with a short text answer. Add an answer label or placeholder text for guidance.`,
    category: 'input',
    icon: MenuIcon,
    render: ({ block, ...rest }) => <TextInputBlock {...({ data: block, ...rest } as TextInputBlockProps)} />,
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
    type: 'picture_choice',
    name: 'Picture Choice',
    description: `Display image-based choices in a grid. Users select one option from visually rich cards.`,
    category: 'input',
    icon: LayoutGridIcon,
    render: ({ block, ...rest }) => <PictureChoiceBlock {...({ data: block, ...rest } as PictureChoiceBlockProps)} />,
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
    type: 'image',
    name: 'Image',
    description: `Display an image with customizable aspect ratio.`,
    category: 'display',
    icon: PhotoIcon,
    render: ({ block, ...rest }) => <ImageBlock {...({ data: block, ...rest } as ImageBlockProps)} />,
  },
  {
    type: 'loader',
    name: 'Loader',
    description: `Display an animated loading bar that fills up over time.`,
    category: 'display',
    icon: LoaderIcon,
    render: (props: FormBlockProps) => <LoaderBlock {...({ data: props.block, ...props } as LoaderBlockProps)} />,
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
