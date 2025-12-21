import type { ParagraphBlock } from '@shopfunnel/core/form/schema'

export interface ParagraphProps {
  schema: ParagraphBlock
}

export function Paragraph(props: ParagraphProps) {
  return <p className="text-base text-muted-foreground">{props.schema.properties.text}</p>
}
