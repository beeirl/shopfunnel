import type { Block as BlockType } from '@shopfunnel/core/form/schema'

import { blockRegistry } from './registry'

export type BlockProps =
  | {
      mode: 'preview'
      block: BlockType
    }
  | {
      mode: 'live'
      block: BlockType
      value?: unknown
      onChange?: (value: unknown) => void
    }

export function Block(props: BlockProps) {
  const block = blockRegistry[props.block.type]
  if (!block) return null
  return <block.component {...props} />
}
