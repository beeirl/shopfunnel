import type { Block as BlockData } from '@shopfunnel/core/form/types'
import { GaugeBlockPane } from './block-panes/gauge'
import { MultipleChoiceBlockPane } from './block-panes/multiple-choice'
import { ShortTextBlockPane } from './block-panes/short-text'

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
    case 'short_text':
      return <ShortTextBlockPane data={data} onDataUpdate={onDataUpdate} />
    case 'multiple_choice':
      return <MultipleChoiceBlockPane data={data} onDataUpdate={onDataUpdate} onImageUpload={onImageUpload} />
    case 'gauge':
      return <GaugeBlockPane data={data} onDataUpdate={onDataUpdate} />
  }
}
