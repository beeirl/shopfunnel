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

export function BlockPanel() {
  const { data: funnel, uploadFile } = useFunnel()
  const { selectedBlock, save } = useFunnelEditor()

  if (!selectedBlock) return null

  const block = selectedBlock

  const handleBlockUpdate = (updates: Partial<BlockType>) => {
    const updatedPages = funnel.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((b) => (b.id === block.id ? ({ ...b, ...updates } as BlockType) : b)),
    }))
    save({ pages: updatedPages })
  }

  const handleHtmlChange = (html: string) => {
    const updatedPages = funnel.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((b) =>
        b.id === block.id && b.type === 'html' ? { ...b, properties: { ...b.properties, html } } : b,
      ),
    }))
    save({ pages: updatedPages })
  }

  switch (block.type) {
    case 'text_input':
      return <TextInputBlockPanel block={block} onBlockUpdate={handleBlockUpdate} />
    case 'multiple_choice':
      return <MultipleChoiceBlockPanel block={block} onBlockUpdate={handleBlockUpdate} onImageUpload={uploadFile} />
    case 'picture_choice':
      return <PictureChoiceBlockPanel block={block} onBlockUpdate={handleBlockUpdate} onImageUpload={uploadFile} />
    case 'dropdown':
      return <DropdownBlockPanel block={block} onBlockUpdate={handleBlockUpdate} />
    case 'gauge':
      return <GaugeBlockPanel block={block} onBlockUpdate={handleBlockUpdate} />
    case 'image':
      return <ImageBlockPanel block={block} onBlockUpdate={handleBlockUpdate} onImageUpload={uploadFile} />
    case 'loader':
      return <LoaderBlockPanel block={block} onBlockUpdate={handleBlockUpdate} />
    case 'heading':
      return <HeadingBlockPanel block={block} onBlockUpdate={handleBlockUpdate} />
    case 'paragraph':
      return <ParagraphBlockPanel block={block} onBlockUpdate={handleBlockUpdate} />
    case 'spacer':
      return <SpacerBlockPanel block={block} onBlockUpdate={handleBlockUpdate} />
    case 'html':
      return (
        <HtmlBlockPanel
          block={block}
          onBlockUpdate={handleBlockUpdate}
          onImageUpload={uploadFile}
          onHtmlChange={handleHtmlChange}
        />
      )
  }
}
