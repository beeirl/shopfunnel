import type { ParagraphBlock } from '@shopfunnel/core/form/schema'

export interface ParagraphProps {
  block: ParagraphBlock
}

export function Paragraph({ block }: ParagraphProps) {
  return <p className="text-base text-muted-foreground">{block.properties.text}</p>
}
