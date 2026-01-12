import type { Block as BlockType } from '@shopfunnel/core/funnel/types'
import { DropdownBlockPanel } from './block-panels/dropdown'
import { GaugeBlockPanel } from './block-panels/gauge'
import { HeadingBlockPanel } from './block-panels/heading'
import { HtmlBlockPanel } from './block-panels/html'
import { ImageBlockPanel } from './block-panels/image'
import { LoaderBlockPanel } from './block-panels/loader'
import { MultipleChoiceBlockPanel } from './block-panels/multiple-choice'
import { ParagraphBlockPanel } from './block-panels/paragraph'
import { PictureChoiceBlockPanel } from './block-panels/picture-choice'
import { SpacerBlockPanel } from './block-panels/spacer'
import { TextInputBlockPanel } from './block-panels/text-input'

export function BlockPanel({
  block,
  onBlockUpdate,
  onImageUpload,
  onBlockRemove,
  onHtmlChange,
  onHtmlSave,
}: {
  block: BlockType
  onBlockUpdate: (block: Partial<BlockType>) => void
  onImageUpload: (file: File) => Promise<string>
  onBlockRemove: () => void
  onHtmlChange?: (html: string) => void
  onHtmlSave?: () => void
}) {
  switch (block.type) {
    case 'text_input':
      return <TextInputBlockPanel block={block} onBlockUpdate={onBlockUpdate} onBlockRemove={onBlockRemove} />
    case 'multiple_choice':
      return (
        <MultipleChoiceBlockPanel
          block={block}
          onBlockUpdate={onBlockUpdate}
          onImageUpload={onImageUpload}
          onBlockRemove={onBlockRemove}
        />
      )
    case 'picture_choice':
      return (
        <PictureChoiceBlockPanel
          block={block}
          onBlockUpdate={onBlockUpdate}
          onImageUpload={onImageUpload}
          onBlockRemove={onBlockRemove}
        />
      )
    case 'dropdown':
      return <DropdownBlockPanel block={block} onBlockUpdate={onBlockUpdate} onBlockRemove={onBlockRemove} />
    case 'gauge':
      return <GaugeBlockPanel block={block} onBlockUpdate={onBlockUpdate} onBlockRemove={onBlockRemove} />
    case 'image':
      return (
        <ImageBlockPanel
          block={block}
          onBlockUpdate={onBlockUpdate}
          onImageUpload={onImageUpload}
          onBlockRemove={onBlockRemove}
        />
      )
    case 'loader':
      return <LoaderBlockPanel block={block} onBlockUpdate={onBlockUpdate} onBlockRemove={onBlockRemove} />
    case 'heading':
      return <HeadingBlockPanel block={block} onBlockUpdate={onBlockUpdate} onBlockRemove={onBlockRemove} />
    case 'paragraph':
      return <ParagraphBlockPanel block={block} onBlockUpdate={onBlockUpdate} onBlockRemove={onBlockRemove} />
    case 'spacer':
      return <SpacerBlockPanel block={block} onBlockUpdate={onBlockUpdate} onBlockRemove={onBlockRemove} />
    case 'html':
      return (
        <HtmlBlockPanel
          block={block}
          onBlockUpdate={onBlockUpdate}
          onImageUpload={onImageUpload}
          onBlockRemove={onBlockRemove}
          onHtmlChange={onHtmlChange!}
          onHtmlSave={onHtmlSave!}
        />
      )
  }
}
