import { DropdownBlock } from '@/components/blocks/dropdown'
import { GaugeBlock } from '@/components/blocks/gauge'
import { HeadingBlock } from '@/components/blocks/heading'
import { ImageBlock } from '@/components/blocks/image'
import { ListBlock } from '@/components/blocks/list'
import { LoaderBlock } from '@/components/blocks/loader'
import { MultipleChoiceBlock } from '@/components/blocks/multiple-choice'
import { ParagraphBlock } from '@/components/blocks/paragraph'
import { PictureChoiceBlock } from '@/components/blocks/picture-choice'
import { TextInputBlock } from '@/components/blocks/text-input'
import type {
  Block,
  DropdownBlock as DropdownBlockType,
  GaugeBlock as GaugeBlockType,
  HeadingBlock as HeadingBlockType,
  ImageBlock as ImageBlockType,
  ListBlock as ListBlockType,
  LoaderBlock as LoaderBlockType,
  MultipleChoiceBlock as MultipleChoiceBlockType,
  ParagraphBlock as ParagraphBlockType,
  PictureChoiceBlock as PictureChoiceBlockType,
  TextInputBlock as TextInputBlockType,
} from '@shopfunnel/core/form/types'
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

export interface BlockProps {
  block: Block
  index: number
  static?: boolean
  value?: unknown
  onValueChange?: (value: unknown) => void
  onLoadingValueChange?: (value: boolean) => void
}

export interface BlockInfo {
  type: Block['type']
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export function getBlockInfo(type: Block['type']): BlockInfo {
  switch (type) {
    case 'text_input':
      return {
        type: 'text_input',
        name: 'Text Input',
        description:
          'Use this to insert a question combined with a short text answer. Add an answer label or placeholder text for guidance.',
        icon: MenuIcon,
      }
    case 'multiple_choice':
      return {
        type: 'multiple_choice',
        name: 'Multiple Choice',
        description:
          'Use this to insert a question combined with multiple choice answers. Add an answer label or placeholder text for guidance.',
        icon: ListLettersIcon,
      }
    case 'picture_choice':
      return {
        type: 'picture_choice',
        name: 'Picture Choice',
        description: 'Display image-based choices in a grid. Users select one option from visually rich cards.',
        icon: LayoutGridIcon,
      }
    case 'dropdown':
      return {
        type: 'dropdown',
        name: 'Dropdown',
        description: 'A compact way to present many options. Users can select one option from a dropdown menu.',
        icon: ChevronDownIcon,
      }
    case 'heading':
      return {
        type: 'heading',
        name: 'Heading',
        description: 'Add a title or section header to organize your form and guide users through different sections.',
        icon: HeadingIcon,
      }
    case 'paragraph':
      return {
        type: 'paragraph',
        name: 'Paragraph',
        description: 'Add descriptive text to provide context or instructions.',
        icon: LetterCaseIcon,
      }
    case 'gauge':
      return {
        type: 'gauge',
        name: 'Gauge',
        description: 'Display a visual gauge to show progress or a value within a range.',
        icon: GaugeIcon,
      }
    case 'list':
      return {
        type: 'list',
        name: 'List',
        description: 'Display a list of items with icons and text. Great for showing features or benefits.',
        icon: ListDetailsIcon,
      }
    case 'image':
      return {
        type: 'image',
        name: 'Image',
        description: 'Display an image with customizable aspect ratio.',
        icon: PhotoIcon,
      }
    case 'loader':
      return {
        type: 'loader',
        name: 'Loader',
        description: 'Display an animated loading bar that fills up over time.',
        icon: LoaderIcon,
      }
  }
}

export function getBlockInfoList(): BlockInfo[] {
  return (Object.keys(BLOCKS) as Block['type'][]).map(getBlockInfo)
}

type BlockComponent = (props: BlockProps) => React.ReactNode

const BLOCKS = {} as Record<Block['type'], BlockComponent>

BLOCKS['text_input'] = (props) => (
  <TextInputBlock
    block={props.block as TextInputBlockType}
    index={props.index}
    static={props.static}
    value={props.value as string}
    onValueChange={props.onValueChange as (value: string) => void}
  />
)

BLOCKS['multiple_choice'] = (props) => (
  <MultipleChoiceBlock
    block={props.block as MultipleChoiceBlockType}
    index={props.index}
    static={props.static}
    value={props.value as string | string[] | null}
    onValueChange={props.onValueChange as (value: string | string[] | null) => void}
  />
)

BLOCKS['picture_choice'] = (props) => (
  <PictureChoiceBlock
    block={props.block as PictureChoiceBlockType}
    index={props.index}
    static={props.static}
    value={props.value as string | string[] | null}
    onValueChange={props.onValueChange as (value: string | string[] | null) => void}
  />
)

BLOCKS['dropdown'] = (props) => (
  <DropdownBlock
    block={props.block as DropdownBlockType}
    index={props.index}
    static={props.static}
    value={props.value as string}
    onValueChange={props.onValueChange as (value: string) => void}
  />
)

BLOCKS['heading'] = (props) => (
  <HeadingBlock block={props.block as HeadingBlockType} index={props.index} static={props.static} />
)

BLOCKS['paragraph'] = (props) => (
  <ParagraphBlock block={props.block as ParagraphBlockType} index={props.index} static={props.static} />
)

BLOCKS['gauge'] = (props) => (
  <GaugeBlock block={props.block as GaugeBlockType} index={props.index} static={props.static} />
)

BLOCKS['list'] = (props) => <ListBlock block={props.block as ListBlockType} index={props.index} static={props.static} />

BLOCKS['image'] = (props) => (
  <ImageBlock block={props.block as ImageBlockType} index={props.index} static={props.static} />
)

BLOCKS['loader'] = (props) => (
  <LoaderBlock
    block={props.block as LoaderBlockType}
    index={props.index}
    onLoadingValueChange={props.onLoadingValueChange}
  />
)

export function Block(props: BlockProps) {
  return BLOCKS[props.block.type](props)
}
