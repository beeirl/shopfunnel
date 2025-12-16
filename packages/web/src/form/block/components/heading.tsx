import type { HeadingBlock } from '@shopfunnel/core/form/schema'

export interface HeadingProps {
  block: HeadingBlock
}

export function Heading({ block }: HeadingProps) {
  return <h2 className="text-2xl font-bold text-foreground">{block.properties.text}</h2>
}
