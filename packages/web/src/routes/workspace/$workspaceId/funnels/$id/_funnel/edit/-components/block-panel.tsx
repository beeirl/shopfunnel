import type { Block as BlockType } from '@shopfunnel/core/funnel/types'
import { useFunnelEditor } from '../-context'
import { useFunnel } from '../../-context'
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

export function BlockPanel({ onRemove }: { onRemove: () => void }) {
  const { data: funnel, maybeSave, uploadFile } = useFunnel()
  const { selectedBlock } = useFunnelEditor()

  if (!selectedBlock) return null

  const block = selectedBlock

  const handleBlockUpdate = (updates: Partial<BlockType>) => {
    const updatedPages = funnel.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((b) => (b.id === block.id ? ({ ...b, ...updates } as BlockType) : b)),
    }))
    maybeSave({ pages: updatedPages })
  }

  const handleHtmlChange = (html: string) => {
    const updatedPages = funnel.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((b) =>
        b.id === block.id && b.type === 'html' ? { ...b, properties: { ...b.properties, html } } : b,
      ),
    }))
    maybeSave({ pages: updatedPages })
  }

  switch (block.type) {
    case 'text_input':
      return <TextInputBlockPanel block={block} onBlockUpdate={handleBlockUpdate} onBlockRemove={onRemove} />
    case 'multiple_choice':
      return (
        <MultipleChoiceBlockPanel
          block={block}
          onBlockUpdate={handleBlockUpdate}
          onImageUpload={uploadFile}
          onBlockRemove={onRemove}
        />
      )
    case 'picture_choice':
      return (
        <PictureChoiceBlockPanel
          block={block}
          onBlockUpdate={handleBlockUpdate}
          onImageUpload={uploadFile}
          onBlockRemove={onRemove}
        />
      )
    case 'dropdown':
      return <DropdownBlockPanel block={block} onBlockUpdate={handleBlockUpdate} onBlockRemove={onRemove} />
    case 'gauge':
      return <GaugeBlockPanel block={block} onBlockUpdate={handleBlockUpdate} onBlockRemove={onRemove} />
    case 'image':
      return (
        <ImageBlockPanel
          block={block}
          onBlockUpdate={handleBlockUpdate}
          onImageUpload={uploadFile}
          onBlockRemove={onRemove}
        />
      )
    case 'loader':
      return <LoaderBlockPanel block={block} onBlockUpdate={handleBlockUpdate} onBlockRemove={onRemove} />
    case 'heading':
      return <HeadingBlockPanel block={block} onBlockUpdate={handleBlockUpdate} onBlockRemove={onRemove} />
    case 'paragraph':
      return <ParagraphBlockPanel block={block} onBlockUpdate={handleBlockUpdate} onBlockRemove={onRemove} />
    case 'spacer':
      return <SpacerBlockPanel block={block} onBlockUpdate={handleBlockUpdate} onBlockRemove={onRemove} />
    case 'html':
      return (
        <HtmlBlockPanel
          block={block}
          onBlockUpdate={handleBlockUpdate}
          onImageUpload={uploadFile}
          onBlockRemove={onRemove}
          onHtmlChange={handleHtmlChange}
        />
      )
  }
}
