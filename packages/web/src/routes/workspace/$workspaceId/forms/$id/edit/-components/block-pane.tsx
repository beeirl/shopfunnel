import { Block as BlockSchema } from '@shopfunnel/core/form/schema'
import { MultipleChoiceBlockPane } from './block-panes/multiple-choice'
import { ShortTextBlockPane } from './block-panes/short-text'

export function BlockPane({
  schema,
  onSchemaUpdate,
  onImageUpload,
}: {
  schema: BlockSchema
  onSchemaUpdate: (schema: Partial<BlockSchema>) => void
  onImageUpload: (file: File) => Promise<string>
}) {
  switch (schema.type) {
    case 'short_text':
      return <ShortTextBlockPane schema={schema} onSchemaUpdate={onSchemaUpdate} />
    case 'multiple_choice':
      return <MultipleChoiceBlockPane schema={schema} onSchemaUpdate={onSchemaUpdate} onImageUpload={onImageUpload} />
  }
}
