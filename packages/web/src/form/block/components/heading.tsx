import type { HeadingBlock } from '@shopfunnel/core/form/schema'

export interface HeadingProps {
  schema: HeadingBlock
}

export function Heading(props: HeadingProps) {
  return <h2 className="text-2xl font-bold text-foreground">{props.schema.properties.text}</h2>
}
