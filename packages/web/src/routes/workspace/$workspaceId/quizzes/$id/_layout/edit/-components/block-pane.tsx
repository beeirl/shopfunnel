import type { Block as BlockType } from '@shopfunnel/core/quiz/types'
import { DropdownBlockPane } from './block-panes/dropdown'
import { GaugeBlockPane } from './block-panes/gauge'
import { HeadingBlockPane } from './block-panes/heading'
import { ImageBlockPane } from './block-panes/image'
import { LoaderBlockPane } from './block-panes/loader'
import { MultipleChoiceBlockPane } from './block-panes/multiple-choice'
import { ParagraphBlockPane } from './block-panes/paragraph'
import { PictureChoiceBlockPane } from './block-panes/picture-choice'
import { TextInputBlockPane } from './block-panes/text-input'

export function BlockPane({
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
      return <TextInputBlockPane block={block} onBlockUpdate={onBlockUpdate} />
    case 'multiple_choice':
      return <MultipleChoiceBlockPane block={block} onBlockUpdate={onBlockUpdate} onImageUpload={onImageUpload} />
    case 'picture_choice':
      return <PictureChoiceBlockPane block={block} onBlockUpdate={onBlockUpdate} onImageUpload={onImageUpload} />
    case 'dropdown':
      return <DropdownBlockPane block={block} onBlockUpdate={onBlockUpdate} />
    case 'gauge':
      return <GaugeBlockPane block={block} onBlockUpdate={onBlockUpdate} />
    case 'image':
      return <ImageBlockPane block={block} onBlockUpdate={onBlockUpdate} onImageUpload={onImageUpload} />
    case 'loader':
      return <LoaderBlockPane block={block} onBlockUpdate={onBlockUpdate} />
    case 'heading':
      return <HeadingBlockPane block={block} onBlockUpdate={onBlockUpdate} />
    case 'paragraph':
      return <ParagraphBlockPane block={block} onBlockUpdate={onBlockUpdate} />
  }
}
