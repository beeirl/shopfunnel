import type { FormBlock } from '../types'

export function ParagraphBlock({ block }: ParagraphBlock.Props) {
  return <p className="text-center font-semibold text-gray-500">{block.properties.text}</p>
}

export namespace ParagraphBlock {
  export interface Props {
    block: Extract<FormBlock, { type: 'paragraph' }>
  }
}
