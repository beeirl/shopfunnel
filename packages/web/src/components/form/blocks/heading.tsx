import type { FormBlock } from '../types'

export function HeadingBlock({ block }: HeadingBlock.Props) {
  return <h1 className="mb text-center text-2xl font-extrabold text-balance sm:text-3xl">{block.properties.text}</h1>
}

export namespace HeadingBlock {
  export interface Props {
    block: Extract<FormBlock, { type: 'heading' }>
  }
}
