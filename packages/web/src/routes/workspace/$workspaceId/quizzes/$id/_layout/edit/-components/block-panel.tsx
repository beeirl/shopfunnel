import type { Block as BlockType } from '@shopfunnel/core/quiz/types'
import { DropdownBlockPanel } from './block-panels/dropdown'
import { GaugeBlockPanel } from './block-panels/gauge'
import { HeadingBlockPanel } from './block-panels/heading'
import { ImageBlockPanel } from './block-panels/image'
import { LoaderBlockPanel } from './block-panels/loader'
import { MultipleChoiceBlockPanel } from './block-panels/multiple-choice'
import { ParagraphBlockPanel } from './block-panels/paragraph'
import { PictureChoiceBlockPanel } from './block-panels/picture-choice'
import { TextInputBlockPanel } from './block-panels/text-input'

export function BlockPanel({
  block,
  onBlockUpdate,
  onImageUpload,
}: {
  block: BlockType
  onBlockUpdate: (block: Partial<BlockType>) => void
  onImageUpload: (file: File) => Promise<string>
}) {
  switch (block.type) {
    case 'text_input':
      return <TextInputBlockPanel block={block} onBlockUpdate={onBlockUpdate} />
    case 'multiple_choice':
      return <MultipleChoiceBlockPanel block={block} onBlockUpdate={onBlockUpdate} onImageUpload={onImageUpload} />
    case 'picture_choice':
      return <PictureChoiceBlockPanel block={block} onBlockUpdate={onBlockUpdate} onImageUpload={onImageUpload} />
    case 'dropdown':
      return <DropdownBlockPanel block={block} onBlockUpdate={onBlockUpdate} />
    case 'gauge':
      return <GaugeBlockPanel block={block} onBlockUpdate={onBlockUpdate} />
    case 'image':
      return <ImageBlockPanel block={block} onBlockUpdate={onBlockUpdate} onImageUpload={onImageUpload} />
    case 'loader':
      return <LoaderBlockPanel block={block} onBlockUpdate={onBlockUpdate} />
    case 'heading':
      return <HeadingBlockPanel block={block} onBlockUpdate={onBlockUpdate} />
    case 'paragraph':
      return <ParagraphBlockPanel block={block} onBlockUpdate={onBlockUpdate} />
  }
}
