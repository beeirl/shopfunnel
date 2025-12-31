import type { Block as BlockData } from '@shopfunnel/core/quiz/types'
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
  data,
  onDataUpdate,
  onImageUpload,
}: {
  data: BlockData
  onDataUpdate: (data: Partial<BlockData>) => void
  onImageUpload: (file: File) => Promise<string>
}) {
  switch (data.type) {
    case 'text_input':
      return <TextInputBlockPane data={data} onDataUpdate={onDataUpdate} />
    case 'multiple_choice':
      return <MultipleChoiceBlockPane data={data} onDataUpdate={onDataUpdate} onImageUpload={onImageUpload} />
    case 'picture_choice':
      return <PictureChoiceBlockPane data={data} onDataUpdate={onDataUpdate} onImageUpload={onImageUpload} />
    case 'dropdown':
      return <DropdownBlockPane data={data} onDataUpdate={onDataUpdate} />
    case 'gauge':
      return <GaugeBlockPane data={data} onDataUpdate={onDataUpdate} />
    case 'image':
      return <ImageBlockPane data={data} onDataUpdate={onDataUpdate} onImageUpload={onImageUpload} />
    case 'loader':
      return <LoaderBlockPane data={data} onDataUpdate={onDataUpdate} />
    case 'heading':
      return <HeadingBlockPane data={data} onDataUpdate={onDataUpdate} />
    case 'paragraph':
      return <ParagraphBlockPane data={data} onDataUpdate={onDataUpdate} />
  }
}
